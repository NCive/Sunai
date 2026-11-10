"""
Audio Cache Generator for Sunai Voice Assistant.
Synthesizes all required pre-recorded audio responses using the Gnani Timbre API
(model: timbre-v2.5, voices: Devika for hi-IN/mr-IN, Pranav for en-IN).
Saves WAV files to Backend/audio_cache/<lang>/<phrase>.wav and generates manifest.json.
"""

import argparse
import hashlib
import json
import logging
from pathlib import Path
import struct
import sys
import time

# Ensure Sunai root is in sys.path
sunai_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(sunai_root))

from Backend import config
from gnani.tts import GnaniTTSClient, AudioConfig

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("generate_audio_cache")


def compute_sha256(data: bytes) -> str:
    """Computes SHA-256 hex digest of bytes."""
    return hashlib.sha256(data).hexdigest()


def get_wav_duration_seconds(wav_bytes: bytes) -> float:
    """Calculates actual audio duration in seconds for 16kHz 16-bit mono PCM WAV."""
    if len(wav_bytes) < 44:
        return 0.0
    # In 16kHz mono 16-bit PCM: 32000 bytes per second
    pcm_bytes = max(0, len(wav_bytes) - 44)
    return pcm_bytes / 32000.0


def main():
    parser = argparse.ArgumentParser(description="Generate Sunai pre-recorded audio cache using Gnani Timbre API.")
    parser.add_argument("--force", action="store_true", help="Force overwrite existing audio cache files.")
    parser.add_argument("--lang", type=str, default="all", help="Target language (hi-IN, mr-IN, en-IN, or all).")
    args = parser.parse_args()

    api_key = config.GNANI_API_KEY
    if not api_key:
        logger.error("GNANI_API_KEY is not set in environment or .env! Cannot synthesize with Timbre.")
        sys.exit(1)

    logger.info(f"Initializing GnaniTTSClient with API key (length={len(api_key)})...")
    client = GnaniTTSClient(api_key=api_key)

    cache_dir = config.AUDIO_CACHE_DIR
    cache_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = cache_dir / "manifest.json"

    manifest = {}
    if manifest_path.exists() and not args.force:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception:
            manifest = {}

    target_languages = ["hi-IN", "mr-IN", "en-IN"] if args.lang == "all" else [args.lang]

    audio_cfg = AudioConfig(
        sample_rate=config.TIMBRE_SAMPLE_RATE,
        encoding="linear_pcm",
        num_channels=1,
        sample_width=2,
        container=config.TIMBRE_CONTAINER,
    )

    generated_count = 0
    skipped_count = 0

    for phrase_key, lang_dict in config.CACHE_PHRASES.items():
        for lang, text in lang_dict.items():
            if lang not in target_languages:
                continue

            lang_dir = cache_dir / lang
            lang_dir.mkdir(parents=True, exist_ok=True)
            wav_path = lang_dir / f"{phrase_key}.wav"
            manifest_key = f"{lang}/{phrase_key}"

            # Check if exists and force is not set
            if wav_path.exists() and not args.force and manifest_key in manifest:
                entry = manifest[manifest_key]
                if entry.get("source") == "timbre_api":
                    current_hash = compute_sha256(wav_path.read_bytes())
                    if current_hash == entry.get("sha256"):
                        logger.info(f"[SKIP] {manifest_key} already exists and matches manifest SHA256.")
                        skipped_count += 1
                        continue

            voice = config.TIMBRE_VOICES.get(lang, "Devika")
            logger.info(f"[SYNTHESIZING] {manifest_key} | voice={voice} | text='{text}'")

            try:
                wav_bytes = client.synthesize(
                    text=text,
                    voice=voice,
                    model=config.TIMBRE_MODEL,
                    language=lang,
                    speed=config.TIMBRE_SPEED,
                    audio_config=audio_cfg,
                )

                if not wav_bytes or len(wav_bytes) < 100:
                    raise ValueError(f"Synthesis returned invalid audio data ({len(wav_bytes) if wav_bytes else 0} bytes)")

                wav_path.write_bytes(wav_bytes)
                sha256 = compute_sha256(wav_bytes)
                duration = get_wav_duration_seconds(wav_bytes)

                manifest[manifest_key] = {
                    "phrase": phrase_key,
                    "language": lang,
                    "voice": voice,
                    "model": config.TIMBRE_MODEL,
                    "text": text,
                    "file_path": str(wav_path.relative_to(cache_dir)),
                    "file_size_bytes": len(wav_bytes),
                    "duration_seconds": round(duration, 3),
                    "sha256": sha256,
                    "source": "timbre_api",
                    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }

                logger.info(
                    f"[DONE] Saved {manifest_key}.wav ({len(wav_bytes)} bytes, {duration:.2f}s, sha256={sha256[:8]}...)"
                )
                generated_count += 1

                # Polite delay between API calls
                time.sleep(0.3)

            except Exception as e:
                logger.error(f"[ERROR] Failed to synthesize {manifest_key}: {e}")
                sys.exit(1)

    # Save manifest
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(
        f"\n[CACHE SUMMARY] Successfully generated: {generated_count}, Skipped: {skipped_count}, Total in manifest: {len(manifest)}"
    )
    logger.info(f"Manifest written to: {manifest_path}")


if __name__ == "__main__":
    main()
