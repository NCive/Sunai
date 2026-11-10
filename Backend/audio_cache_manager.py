"""
Audio Cache Manager for Sunai Voice Assistant.
Manages pre-recorded assistant audio clips (ji?, kya kaha?, please_wait, etc.)
synthesized via Gnani Timbre API.
Validates cache against manifest.json and rejects synthetic fallbacks.
"""

import hashlib
import json
import logging
from pathlib import Path
from Backend import config

logger = logging.getLogger(__name__)


def compute_sha256(data: bytes) -> str:
    """Computes SHA-256 digest of bytes."""
    return hashlib.sha256(data).hexdigest()


def ensure_audio_cache() -> None:
    """
    Validates that all pre-recorded audio files for all supported languages exist in audio_cache/
    and match the official Timbre API manifest.json.
    Fails loudly if any required phrase is missing.
    """
    cache_dir = config.AUDIO_CACHE_DIR
    manifest_path = cache_dir / "manifest.json"

    if not manifest_path.exists():
        err_msg = (
            f"[AudioCache] Manifest missing at {manifest_path}! "
            "Please run 'python Backend/tools/generate_audio_cache.py' to generate with Gnani Timbre API."
        )
        logger.error(err_msg)
        raise RuntimeError(err_msg)

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as e:
        err_msg = f"[AudioCache] Failed to load manifest.json: {e}"
        logger.error(err_msg)
        raise RuntimeError(err_msg)

    missing_or_corrupt = []

    for phrase_key, lang_dict in config.CACHE_PHRASES.items():
        for lang in lang_dict.keys():
            manifest_key = f"{lang}/{phrase_key}"
            if manifest_key not in manifest:
                missing_or_corrupt.append(f"{manifest_key} (missing from manifest)")
                continue

            entry = manifest[manifest_key]
            if entry.get("source") != "timbre_api":
                missing_or_corrupt.append(f"{manifest_key} (source is not timbre_api)")
                continue

            wav_path = cache_dir / lang / f"{phrase_key}.wav"
            if not wav_path.exists():
                missing_or_corrupt.append(f"{manifest_key} (file {wav_path} does not exist)")
                continue

            wav_bytes = wav_path.read_bytes()
            if len(wav_bytes) < 100:
                missing_or_corrupt.append(f"{manifest_key} (file is empty or truncated)")
                continue

            file_hash = compute_sha256(wav_bytes)
            if file_hash != entry.get("sha256"):
                missing_or_corrupt.append(f"{manifest_key} (SHA256 mismatch)")
                continue

    if missing_or_corrupt:
        err_msg = (
            f"[AudioCache] Audio cache validation failed for {len(missing_or_corrupt)} items: "
            f"{', '.join(missing_or_corrupt[:5])}. "
            "Please run 'python Backend/tools/generate_audio_cache.py --force' to regenerate."
        )
        logger.error(err_msg)
        raise RuntimeError(err_msg)

    logger.info(f"[AudioCache] Successfully verified {len(manifest)} cached audio clips via manifest.json.")


def get_cached_audio(phrase_key: str, language: str = "hi-IN") -> bytes:
    """
    Retrieves the pre-recorded audio bytes for a phrase in the specified language.
    Falls back to hi-IN if requested language is not available.
    Raises FileNotFoundError if the file is not in cache (no silent synthetic fallback).
    """
    cache_dir = config.AUDIO_CACHE_DIR
    file_path = cache_dir / language / f"{phrase_key}.wav"

    if file_path.exists():
        return file_path.read_bytes()

    # Fallback to hi-IN
    fallback_path = cache_dir / "hi-IN" / f"{phrase_key}.wav"
    if fallback_path.exists():
        logger.warning(f"[AudioCache] Cache miss for {language}/{phrase_key}.wav; falling back to hi-IN.")
        return fallback_path.read_bytes()

    raise FileNotFoundError(
        f"[AudioCache] Pre-recorded clip not found for {language}/{phrase_key}.wav or hi-IN fallback. "
        "Run 'python Backend/tools/generate_audio_cache.py' to generate."
    )
