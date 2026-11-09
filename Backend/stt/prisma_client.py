"""
Prisma STT Client for Sunai.
Reuses the exact Gnani Prisma v3.0 streaming pattern from Voice_Api/test_prisma.py.
Handles real-time WebSocket audio streaming, language detection, and transcript events.
"""

import asyncio
import logging
from typing import Callable, AsyncIterator, Optional, Any
from gnani.stt import (
    GnaniSTTStreamClient,
    StreamTranscriptEvent,
    StreamProcessingEvent,
    StreamErrorEvent,
)
from Backend import config

logger = logging.getLogger(__name__)

TranscriptCallback = Callable[[str, Optional[str], bool], Any]


class PrismaSTTSession:
    """
    Manages an active streaming STT session connected to Gnani Prisma v3.0.
    """

    def __init__(self, on_transcript: TranscriptCallback):
        """
        :param on_transcript: Callback called with (text, detected_language, is_final)
        """
        self.on_transcript = on_transcript
        self.client: Optional[GnaniSTTStreamClient] = None
        self.is_connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._audio_queue: Optional[asyncio.Queue[Optional[bytes]]] = None
        self.detected_language: Optional[str] = None
        self.accumulated_text: str = ""

    async def start(self) -> None:
        """Connects the WebSocket stream to Prisma v3.0."""
        self._audio_queue = asyncio.Queue()
        if not config.GNANI_API_KEY:
            logger.warning("[PrismaSTT] No GNANI_API_KEY found. Running in offline/mock mode.")
            self.is_connected = True
            self._receive_task = asyncio.create_task(self._mock_receive_loop())
            return

        try:
            # Model prisma-v3.0 with multi-language candidates
            self.client = GnaniSTTStreamClient(
                api_key=config.GNANI_API_KEY,
                language_code=config.PRISMA_DEFAULT_LANGUAGE,
                language_candidates=config.PRISMA_CANDIDATE_LANGUAGES,
                model=config.PRISMA_MODEL,
                sample_rate=config.PRISMA_SAMPLE_RATE,
                format=config.PRISMA_FORMAT,
            )
            await self.client.connect()
            self.is_connected = True
            logger.info("[PrismaSTT] Connected to Prisma v3.0 streaming endpoint.")
            self._receive_task = asyncio.create_task(self._receive_loop())
        except Exception as e:
            logger.error(f"[PrismaSTT] Connection failed: {e}")
            self.is_connected = False
            raise

    async def send_audio(self, chunk: bytes) -> None:
        """Sends raw 16kHz 16-bit PCM chunk to Prisma."""
        if not self.is_connected:
            return

        if self.client:
            await self.client.send_audio(chunk)
        elif self._audio_queue:
            await self._audio_queue.put(chunk)

    async def _receive_loop(self) -> None:
        """Consumes incoming events from the Prisma WebSocket stream."""
        if not self.client:
            return

        try:
            async for event in self.client.events():
                if isinstance(event, StreamTranscriptEvent):
                    text = event.text.strip()
                    lang = event.detected_language_code or self.detected_language
                    if lang:
                        self.detected_language = lang
                    self.accumulated_text = text

                    logger.info(f"[PrismaSTT] Transcript: '{text}' (lang={lang})")
                    self.on_transcript(text, lang, True)

                elif isinstance(event, StreamProcessingEvent):
                    # Processing status event
                    pass

                elif isinstance(event, StreamErrorEvent):
                    logger.error(f"[PrismaSTT] Stream error: {event.message}")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[PrismaSTT] Receive loop error: {e}")

    async def _mock_receive_loop(self) -> None:
        """Simulates incoming transcripts for testing when no API key is present."""
        chunks_received = 0
        try:
            while self.is_connected:
                chunk = await self._audio_queue.get()
                if chunk is None:
                    break
                chunks_received += 1
                # Emit mock transcript after receiving ~1.5s of audio (15 chunks)
                if chunks_received == 15:
                    mock_text = "नमस्ते सुनाई"
                    self.detected_language = "hi-IN"
                    self.accumulated_text = mock_text
                    self.on_transcript(mock_text, self.detected_language, True)
        except asyncio.CancelledError:
            pass

    async def close(self) -> None:
        """Closes the streaming session cleanly."""
        self.is_connected = False
        if self._audio_queue:
            await self._audio_queue.put(None)
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
            self._receive_task = None

        if self.client:
            try:
                await self.client.close()
            except Exception:
                pass
            self.client = None
