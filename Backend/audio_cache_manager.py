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


def get_smalltalk_audio(match, tts_client=None) -> bytes:
    """
    Retrieves the pre-recorded audio bytes for a SmallTalkMatch.
    1. Checks cache for match.cache_key in match.target_lang.
    2. Falls back to hi-IN or en-IN in cache.
    3. If still missing, synthesizes live using GnaniTTSClient (Timbre API).
    4. Logs an ERROR if synthesis fails, and raises RuntimeError (no synthetic/beep fallback).
    """
    cache_dir = config.AUDIO_CACHE_DIR
    target_lang = match.target_lang
    phrase_key = match.cache_key

    # 1. Primary lookup
    file_path = cache_dir / target_lang / f"{phrase_key}.wav"
    if file_path.exists():
        return file_path.read_bytes()

    # 2. Cache fallbacks
    for fb_lang in ("hi-IN", "en-IN"):
        fb_path = cache_dir / fb_lang / f"{phrase_key}.wav"
        if fb_path.exists():
            logger.warning(f"[AudioCache] Cache miss for smalltalk {target_lang}/{phrase_key}.wav; falling back to {fb_lang}.")
            return fb_path.read_bytes()

    # 3. Live synthesis fallback with Timbre API
    logger.info(f"[AudioCache] Cache miss for {target_lang}/{phrase_key}.wav. Synthesizing live with Timbre...")
    try:
        from gnani.tts import GnaniTTSClient, AudioConfig
        client = tts_client
        if client is None:
            if not config.GNANI_API_KEY:
                raise ValueError("GNANI_API_KEY is not configured.")
            client = GnaniTTSClient(api_key=config.GNANI_API_KEY)

        timbre_lang = "hi-IN" if target_lang == "hinglish" else target_lang
        voice = "Pranav" if target_lang == "en-IN" else "Devika"
        audio_cfg = AudioConfig(
            sample_rate=config.TIMBRE_SAMPLE_RATE,
            encoding="linear_pcm",
            num_channels=1,
            sample_width=2,
            container=config.TIMBRE_CONTAINER,
        )

        wav_bytes = client.synthesize(
            text=match.reply_text,
            voice=voice,
            model=config.TIMBRE_MODEL,
            language=timbre_lang,
            speed=config.TIMBRE_SPEED,
            audio_config=audio_cfg,
        )

        if not wav_bytes or len(wav_bytes) < 100:
            raise ValueError(f"Synthesis returned invalid audio data ({len(wav_bytes) if wav_bytes else 0} bytes)")

        # Persist to cache
        target_dir = cache_dir / target_lang
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(wav_bytes)
        logger.info(f"[AudioCache] Live synthesis succeeded and saved to {file_path}")
        return wav_bytes

    except Exception as e:
        logger.error(f"[AudioCache] ERROR: Live Timbre synthesis failed for small talk '{match.reply_text}': {e}", exc_info=True)
        raise RuntimeError(f"Failed to produce small talk audio for '{match.reply_text}': {e}") from e
