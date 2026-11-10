"""
Record Samples Utility for Sunai Speech & Noise Evaluation.
Records or generates 10 short labelled 16kHz mono PCM16 WAV audio samples:
- 5 Speech samples ('wait', 'haan', 'go on', 'what is Armour365', 'namaste')
- 5 Noise samples (clap, keyboard typing, cough, fan hum, desk tap)
Saves samples and 'manifest.json' to tests/samples/ (gitignored).

Usage:
  python tests/tools/record_samples.py --synthetic   # Generates all 10 synthetic samples
  python tests/tools/record_samples.py --interactive # Interactive mic recording (requires sounddevice/pyaudio)
"""

import argparse
import io
import json
import math
import os
import random
import struct
import sys
from pathlib import Path

# Sunai root
root_dir = Path(__file__).resolve().parent.parent.parent
SAMPLES_DIR = root_dir / "tests" / "samples"

SAMPLE_DEFINITIONS = [
    # 5 Speech Samples
    {"id": "speech_01_wait", "category": "speech", "label": "wait", "lang": "en-IN", "duration_sec": 1.0},
    {"id": "speech_02_haan", "category": "speech", "label": "haan", "lang": "hi-IN", "duration_sec": 1.0},
    {"id": "speech_03_go_on", "category": "speech", "label": "go on", "lang": "en-IN", "duration_sec": 1.0},
    {"id": "speech_04_what_is_armour365", "category": "speech", "label": "what is Armour365", "lang": "en-IN", "duration_sec": 2.0},
    {"id": "speech_05_namaste", "category": "speech", "label": "namaste", "lang": "hi-IN", "duration_sec": 1.2},

    # 5 Noise Samples
    {"id": "noise_01_clap", "category": "noise", "label": "[noise: clap]", "lang": "none", "duration_sec": 0.8},
    {"id": "noise_02_keyboard", "category": "noise", "label": "[noise: keyboard]", "lang": "none", "duration_sec": 1.5},
    {"id": "noise_03_cough", "category": "noise", "label": "[noise: cough]", "lang": "none", "duration_sec": 1.0},
    {"id": "noise_04_fan_hum", "category": "noise", "label": "[noise: fan hum]", "lang": "none", "duration_sec": 2.0},
    {"id": "noise_05_desk_tap", "category": "noise", "label": "[noise: desk tap]", "lang": "none", "duration_sec": 0.8},
]


def create_wav_bytes(pcm_samples: list[int], sample_rate: int = 16000) -> bytes:
    """Wraps PCM16 samples with standard RIFF WAV header."""
    num_samples = len(pcm_samples)
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
    out.write(struct.pack(f"<{num_samples}h", *pcm_samples))
    return out.getvalue()


def generate_synthetic_sample(item: dict, sample_rate: int = 16000) -> bytes:
    """Generates synthetic audio for a sample definition."""
    cat = item["category"]
    sample_id = item["id"]
    duration = item["duration_sec"]
    num_samples = int(sample_rate * duration)
    samples = []

    if cat == "speech":
        # Multi-harmonic voice formants
        f0 = 160.0 if "wait" in sample_id else (220.0 if "haan" in sample_id else 180.0)
        for i in range(num_samples):
            t = i / sample_rate
            env = math.sin(min(1.0, t / (duration * 0.8)) * math.pi)
            harmonics = (
                0.6 * math.sin(2 * math.pi * f0 * t) +
                0.3 * math.sin(2 * math.pi * 2 * f0 * t) +
                0.15 * math.sin(2 * math.pi * 3 * f0 * t)
            )
            val = int(env * harmonics * 0.7 * 32767)
            samples.append(max(-32768, min(32767, val)))

    elif "clap" in sample_id:
        random.seed(42)
        for i in range(num_samples):
            t = i / sample_rate
            env = math.exp(-40.0 * t)
            val = int(env * (random.random() * 2.0 - 1.0) * 0.9 * 32767)
            samples.append(max(-32768, min(32767, val)))

    elif "keyboard" in sample_id:
        samples = [0] * num_samples
        random.seed(52)
        interval = int(sample_rate * 0.12)
        for st in range(0, num_samples, interval):
            for j in range(int(sample_rate * 0.01)):
                if st + j < num_samples:
                    samples[st + j] = int((random.random() * 2.0 - 1.0) * 0.6 * 32767)

    elif "cough" in sample_id:
        random.seed(62)
        for i in range(num_samples):
            t = i / sample_rate
            env = math.exp(-6.0 * t) * math.sin(min(1.0, t / 0.04) * math.pi)
            val = int(env * (random.random() * 2.0 - 1.0) * 0.75 * 32767)
            samples.append(max(-32768, min(32767, val)))

    elif "fan_hum" in sample_id:
        for i in range(num_samples):
            t = i / sample_rate
            val_f = 0.4 * math.sin(2 * math.pi * 60.0 * t) + 0.2 * math.sin(2 * math.pi * 120.0 * t)
            samples.append(int(val_f * 32767))

    elif "desk_tap" in sample_id:
        random.seed(72)
        for i in range(num_samples):
            t = i / sample_rate
            env = math.exp(-30.0 * t)
            val = int(env * math.sin(2 * math.pi * 150.0 * t) * 0.85 * 32767)
            samples.append(max(-32768, min(32767, val)))

    return create_wav_bytes(samples, sample_rate)


def main():
    parser = argparse.ArgumentParser(description="Record or generate 10 labeled speech/noise samples.")
    parser.add_argument("--synthetic", action="store_true", default=True, help="Generate synthetic WAV samples.")
    parser.add_argument("--interactive", action="store_true", help="Record interactively from microphone.")
    args = parser.parse_args()

    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    print("=" * 80)
    print(f"SUNAI SAMPLE RECORDER / GENERATOR -> {SAMPLES_DIR}")
    print("=" * 80)

    for item in SAMPLE_DEFINITIONS:
        file_name = f"{item['id']}.wav"
        file_path = SAMPLES_DIR / file_name

        if args.interactive:
            try:
                import sounddevice as sd
                input(f"\nPress Enter and speak/make sound for '{item['id']}' ({item['label']})...")
                duration = item["duration_sec"]
                rec = sd.rec(int(duration * 16000), samplerate=16000, channels=1, dtype="int16")
                sd.wait()
                wav_bytes = create_wav_bytes(rec.flatten().tolist(), sample_rate=16000)
            except ImportError:
                print("sounddevice not installed. Falling back to synthetic generation.")
                wav_bytes = generate_synthetic_sample(item)
        else:
            wav_bytes = generate_synthetic_sample(item)

        with open(file_path, "wb") as f:
            f.write(wav_bytes)

        manifest.append({
            "id": item["id"],
            "filename": file_name,
            "category": item["category"],
            "label": item["label"],
            "language": item["lang"],
            "duration_sec": item["duration_sec"],
            "bytes_size": len(wav_bytes),
        })
        print(f"  ✓ Saved '{file_name}' ({item['category']}: '{item['label']}', {len(wav_bytes)} bytes)")

    manifest_path = SAMPLES_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nManifest written to {manifest_path}")
    print(f"Generated {len(manifest)} samples (5 speech, 5 noise).")


if __name__ == "__main__":
    main()

