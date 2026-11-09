/**
 * Helper to generate synthetic test audio buffers (WAV format)
 * Allows testing the PlayQueue and SPEAKING spectrum visualization without external files.
 */
export function generateTestWav(durationSec = 2.5, frequency = 240): ArrayBuffer {
  const sampleRate = 16000;
  const numSamples = Math.floor(durationSec * sampleRate);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate multi-harmonic speech-like cadence
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Modulate amplitude like speech syllables (4 Hz modulation)
    const envelope = Math.max(0, Math.sin(t * Math.PI * 4.0));
    // Fundamental + harmonics for rich spectrum
    const f0 = frequency + Math.sin(t * 8.0) * 20.0;
    const s1 = Math.sin(2 * Math.PI * f0 * t) * 0.5;
    const s2 = Math.sin(2 * Math.PI * (f0 * 2) * t) * 0.25;
    const s3 = Math.sin(2 * Math.PI * (f0 * 3) * t) * 0.15;
    const sample = (s1 + s2 + s3) * envelope * 0.8;

    const clamped = Math.max(-1, Math.min(1, sample));
    const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

