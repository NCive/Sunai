"""
Timbre TTS Client for Sunai.
Uses Gnani Timbre v2.5/v3.0 to generate natural-sounding speech across Hindi, Marathi, and English.
Outputs standard 16 kHz mono WAV audio bytes.
"""

import io
import math
import struct
import logging
from typing import Optional
from gnani.tts import GnaniTTSClient, AudioConfig
from Backend import config

logger = logging.getLogger(__name__)


def _generate_synthetic_speech_wav(text: str, sample_rate: int = 16000) -> bytes:
    """
    Generates a synthetic speech-modulated WAV for offline / testing mode.
    Matches duration roughly to syllable count of the text.
    """
    duration = max(1.5, min(8.0, len(text) * 0.08))
    num_samples = int(duration * sample_rate)

    out = io.BytesIO()
    # RIFF header
    out.write(b"RIFF")
    out.write(struct.pack("<I", 36 + num_samples * 2))
    out.write(b"WAVE")
    # fmt chunk
    out.write(b"fmt ")
    out.write(struct.pack("<I", 16))          # Subchunk1Size
    out.write(struct.pack("<H", 1))           # AudioFormat (1=PCM)
    out.write(struct.pack("<H", 1))           # NumChannels (1=mono)
    out.write(struct.pack("<I", sample_rate)) # SampleRate
    out.write(struct.pack("<I", sample_rate * 2)) # ByteRate
    out.write(struct.pack("<H", 2))           # BlockAlign
    out.write(struct.pack("<H", 16))          # BitsPerSample
    # data chunk
    out.write(b"data")
    out.write(struct.pack("<I", num_samples * 2))

    # Multi-harmonic voice formants
    base_freq = 210.0
    for i in range(num_samples):
        t = i / sample_rate
        # Syllabic envelope (~4 Hz cadence)
        envelope = max(0.0, math.sin(t * math.pi * 3.5))
        # Formants
        f0 = base_freq + math.sin(t * 6.0) * 15.0
        s1 = math.sin(2 * math.pi * f0 * t) * 0.45
        s2 = math.sin(2 * math.pi * (f0 * 2.2) * t) * 0.25
        s3 = math.sin(2 * math.pi * (f0 * 3.1) * t) * 0.15
        sample = (s1 + s2 + s3) * envelope * 0.8
        sample = max(-1.0, min(1.0, sample))
        int_sample = int(sample * 32767)
        out.write(struct.pack("<h", int_sample))

    return out.getvalue()


class TimbreTTSClient:
    """
    Client for Gnani Timbre Text-to-Speech synthesis.
    """

    def __init__(self):
        self.api_key = config.GNANI_API_KEY
        self.client: Optional[GnaniTTSClient] = None
        if self.api_key:
            try:
                self.client = GnaniTTSClient(api_key=self.api_key)
                logger.info("[TimbreTTS] Initialized Gnani TTS Client.")
            except Exception as e:
                logger.error(f"[TimbreTTS] Failed to initialize GnaniTTSClient: {e}")
                self.client = None

    def synthesize(
        self,
        text: str,
        language: str = "hi-IN",
        voice: Optional[str] = None,
    ) -> bytes:
        """
        Synthesizes text into 16kHz mono WAV bytes.
        :param text: Text to speak (Devanagari for Hindi/Marathi, Latin for English)
        :param language: BCP-47 language code ('hi-IN', 'mr-IN', 'en-IN')
        :param voice: Voice name override (optional)
        :return: WAV audio bytes
        """
        if not text.strip():
            return b""

        # Resolve voice
        resolved_voice = voice or config.TIMBRE_VOICES.get(
            language, config.TIMBRE_VOICES.get("default", "Devika")
        )

        if self.client:
            try:
                logger.info(
                    f"[TimbreTTS] Calling Timbre synthesis: lang={language}, voice={resolved_voice}, text='{text[:40]}...'"
                )
                audio_config = AudioConfig(
                    sample_rate=config.TIMBRE_SAMPLE_RATE,
                    encoding="linear_pcm",
                    num_channels=1,
                    sample_width=2,
                    container=config.TIMBRE_CONTAINER,
                )
                wav_bytes = self.client.synthesize(
                    text=text,
                    voice=resolved_voice,
                    model=config.TIMBRE_MODEL,
                    language=language,
                    speed=config.TIMBRE_SPEED,
                    audio_config=audio_config,
                )
                return wav_bytes
            except Exception as e:
                logger.error(f"[TimbreTTS] Cloud synthesis failed: {e}")
                raise RuntimeError(f"Gnani Timbre TTS failed for text '{text[:40]}...': {e}") from e

        # Fallback / Offline generator ONLY if no API key is configured
        logger.warning(f"[TimbreTTS] No GNANI_API_KEY configured; generating synthetic audio for: '{text[:30]}...'")
        return _generate_synthetic_speech_wav(text, sample_rate=config.TIMBRE_SAMPLE_RATE)

