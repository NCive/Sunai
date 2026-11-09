"""
Audio Cache Manager for Sunai.
Pre-generates and caches fixed assistant audio responses (ji?, kya kaha aapne?, etc.)
one set per language, saved once in Backend/audio_cache and reused.
"""

import logging
from pathlib import Path
from Backend import config
from Backend.tts import TimbreTTSClient

logger = logging.getLogger(__name__)


def ensure_audio_cache() -> None:
    """
    Ensures all pre-recorded audio files for all supported languages exist in audio_cache/.
    Synthesizes and saves any missing files.
    """
    cache_dir = config.AUDIO_CACHE_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)

    tts = TimbreTTSClient()

    for phrase_key, lang_dict in config.CACHE_PHRASES.items():
        for lang, text in lang_dict.items():
            lang_dir = cache_dir / lang
            lang_dir.mkdir(parents=True, exist_ok=True)
            file_path = lang_dir / f"{phrase_key}.wav"

            if not file_path.exists():
                logger.info(f"[AudioCache] Pre-generating {lang}/{phrase_key}.wav: '{text}'")
                try:
                    wav_bytes = tts.synthesize(text, language=lang)
                    file_path.write_bytes(wav_bytes)
                except Exception as e:
                    logger.error(f"[AudioCache] Failed to generate {file_path}: {e}")


def get_cached_audio(phrase_key: str, language: str = "hi-IN") -> bytes:
    """
    Retrieves the pre-recorded audio bytes for a phrase in the specified language.
    Falls back to Hindi or generates on the fly if missing.
    """
    cache_dir = config.AUDIO_CACHE_DIR
    file_path = cache_dir / language / f"{phrase_key}.wav"

    if file_path.exists():
        return file_path.read_bytes()

    # Fallback to hi-IN
    fallback_path = cache_dir / "hi-IN" / f"{phrase_key}.wav"
    if fallback_path.exists():
        return fallback_path.read_bytes()

    # On-the-fly generation if not cached yet
    text = config.CACHE_PHRASES.get(phrase_key, {}).get(language, "जी?")
    tts = TimbreTTSClient()
    wav_bytes = tts.synthesize(text, language=language)
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(wav_bytes)
    except Exception:
        pass
    return wav_bytes

