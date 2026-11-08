
from pathlib import Path
import soundfile as sf
import numpy as np

input_file = Path("record_out.wav")
output_file = Path("tests/sample.pcm")

if not input_file.exists():
    raise FileNotFoundError(input_file)

output_file.parent.mkdir(parents=True, exist_ok=True)

# Read audio and convert to mono, 16 kHz
audio, sample_rate = sf.read(input_file, dtype="float32", always_2d=True)

# Average channels to mono
audio = audio.mean(axis=1)

# Resample if necessary
if sample_rate != 16000:
    import scipy.signal
    audio = scipy.signal.resample_poly(
        audio, 16000, sample_rate
    )

# Convert float audio to signed 16-bit PCM
audio = np.clip(audio, -1.0, 1.0)
pcm_audio = (audio * 32767).astype("<i2")

output_file.write_bytes(pcm_audio.tobytes())

print("Conversion successful")
print(f"Original sample rate: {sample_rate}")
print(f"Output sample rate: 16000 Hz")
print(f"Output duration: {len(pcm_audio) / 16000:.2f} seconds")
print(f"Output size: {output_file.stat().st_size} bytes")
