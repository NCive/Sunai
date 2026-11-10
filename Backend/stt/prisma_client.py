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

    def __init__(
        self,
        on_transcript: TranscriptCallback,
        language: Optional[str] = None,
        language_override: Optional[str] = None,
    ):
        """
        :param on_transcript: Callback called with (text, detected_language, is_final)
        :param language: Initial language hint or code override
        :param language_override: Explicit language code override
        """
        self.on_transcript = on_transcript
        self.client: Optional[GnaniSTTStreamClient] = None
        self.is_connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._audio_queue: Optional[asyncio.Queue[Optional[bytes]]] = None
        self.detected_language: Optional[str] = None
        self.sticky_language: Optional[str] = None
        resolved_override = language_override or language
        self.language_override: Optional[str] = (
            resolved_override if resolved_override and resolved_override != "indic-auto" else None
        )
        self.accumulated_text: str = ""

    async def set_language_override(self, language: str) -> None:
        """Sets explicit user language preference (e.g. 'en-IN', 'hi-IN', 'mr-IN', 'indic-auto')."""
        self.language_override = language if language != "indic-auto" else None
        logger.info(f"[PrismaSTT] Language override set to: {self.language_override or 'indic-auto'}")
        if self.is_connected:
            await self.close()
            await self.start()

    async def start(self) -> None:
        """Connects the WebSocket stream to Prisma v3.0."""
        self._audio_queue = asyncio.Queue()
        if config.SUNAI_MOCK_GNANI or not config.GNANI_API_KEY:
            logger.warning("[PrismaSTT] Running in offline/mock mode.")
            self.is_connected = True
            self._receive_task = asyncio.create_task(self._mock_receive_loop())
            return

        try:
            # Resolve language code and candidates with sticky language logic
            if self.language_override:
                lang_code = self.language_override
                candidates = None
            elif self.sticky_language and self.sticky_language in ("hi-IN", "mr-IN", "en-IN"):
                lang_code = "indic-auto"
                # Prioritize sticky language candidate
                candidates = [self.sticky_language, "en-IN"] if self.sticky_language != "en-IN" else ["en-IN", "hi-IN"]
            else:
                lang_code = config.PRISMA_DEFAULT_LANGUAGE
                candidates = config.PRISMA_CANDIDATE_LANGUAGES

            # Model prisma-v3.0 with keywords boosting
            self.client = GnaniSTTStreamClient(
                api_key=config.GNANI_API_KEY,
                language_code=lang_code,
                language_candidates=candidates,
                keywords=getattr(config, "PRISMA_KEYWORDS", None),
                model=config.PRISMA_MODEL,
                sample_rate=config.PRISMA_SAMPLE_RATE,
                format=config.PRISMA_FORMAT,
            )
            await self.client.connect()
            self.is_connected = True
            logger.info(f"[PrismaSTT] Connected to Prisma v3.0 (lang={lang_code}, candidates={candidates}).")
            self._receive_task = asyncio.create_task(self._receive_loop())
        except Exception as e:
            logger.error(f"[PrismaSTT] Connection failed: {e}")
            self.is_connected = False
            raise

    async def send_audio(self, chunk: bytes) -> None:
        """Sends raw 16kHz 16-bit PCM chunk to Prisma."""
        if not self.is_connected and config.GNANI_API_KEY:
            logger.info("[PrismaSTT] Reconnecting expired STT session on audio...")
            try:
                await self.start()
            except Exception as e:
                logger.error(f"[PrismaSTT] Auto-reconnect failed: {e}")
                return

        if not self.is_connected:
            return

        if self.client:
            await self.client.send_audio(chunk)
        elif self._audio_queue:
            await self._audio_queue.put(chunk)

    def reset_transcript(self) -> None:
        """Clears accumulated transcript buffer after a turn is finalized."""
        self.accumulated_text = ""

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
                    if "session_end" in event.message:
                        logger.info("[PrismaSTT] STT session ended normally by server (idle timeout).")
                        self.is_connected = False
                        break
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
