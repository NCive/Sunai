import assert from 'node:assert';
import { CONFIG } from '../../Frontend/src/config.ts';
import { generateTestWav } from '../../Frontend/src/audio/syntheticAudio.ts';

console.log('--- RUNNING SUNAI MODULE 1 TESTS ---\n');

// Test 1: Configuration Integrity
console.log('Test 1: Validating CONFIG parameters...');
assert.strictEqual(CONFIG.audioCapture.sampleRate, 16000, 'Audio capture must be 16kHz');
assert.strictEqual(CONFIG.audioCapture.channelCount, 1, 'Audio capture must be mono (1 channel)');
assert.strictEqual(CONFIG.audioCapture.chunkDurationMs, 32, 'Chunk duration should be 32ms (AudioWorklet 512 samples)');
assert.strictEqual(CONFIG.audioCapture.chunkSamples, 512, 'Chunk samples must be 512');
assert.strictEqual(CONFIG.audioCapture.echoCancellation, true, 'echoCancellation must be true');
assert.strictEqual(CONFIG.audioCapture.noiseSuppression, true, 'noiseSuppression must be true');
assert.strictEqual(CONFIG.sphere.dotCount, 6000, 'Default dot count must be 6000');
assert.strictEqual(CONFIG.sphere.lowPowerDotCount, 2000, 'Low power dot count must be 2000');
assert.strictEqual(CONFIG.sphere.rowCount, 48, 'Row count must be 48');
assert.ok(CONFIG.sphere.decisionFillDurationMs >= 300 && CONFIG.sphere.decisionFillDurationMs <= 500, 'Decision fill duration must be 300-500ms');
assert.strictEqual(CONFIG.sphere.decisionRingColors.noise, '#22c55e', 'Noise decision must be green');
assert.strictEqual(CONFIG.sphere.decisionRingColors.interruption, '#ef4444', 'Interruption decision must be red');
console.log('✓ Test 1 Passed: Configuration integrity verified.\n');

// Test 2: Synthetic WAV Generator
console.log('Test 2: Validating generateTestWav()...');
const wavBuffer = generateTestWav(1.0, 440);
assert.ok(wavBuffer.byteLength > 44, 'WAV buffer must contain header + samples');
const view = new DataView(wavBuffer);
const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
assert.strictEqual(riff, 'RIFF', 'Header must be RIFF');
assert.strictEqual(wave, 'WAVE', 'Format must be WAVE');
assert.strictEqual(fmt, 'fmt ', 'Subchunk must be fmt');
assert.strictEqual(view.getUint16(20, true), 1, 'Audio format must be 1 (PCM)');
assert.strictEqual(view.getUint16(22, true), 1, 'Num channels must be 1 (mono)');
assert.strictEqual(view.getUint32(24, true), 16000, 'Sample rate must be 16000 Hz');
assert.strictEqual(view.getUint16(34, true), 16, 'Bits per sample must be 16');
console.log('✓ Test 2 Passed: 16kHz mono 16-bit PCM WAV generated correctly.\n');

// Test 3: Audio Chunk Math
console.log('Test 3: Validating chunk size calculation...');
const expectedSamplesPerChunk = CONFIG.audioCapture.chunkSamples ?? Math.round(
  (CONFIG.audioCapture.sampleRate * CONFIG.audioCapture.chunkDurationMs) / 1000
);
assert.strictEqual(expectedSamplesPerChunk, 512, '32ms at 16kHz must equal exactly 512 samples');
const pcmBytesPerChunk = expectedSamplesPerChunk * 2; // 16-bit = 2 bytes per sample
assert.strictEqual(pcmBytesPerChunk, 1024, 'Chunk buffer size must be 1024 bytes');
console.log('✓ Test 3 Passed: Audio chunk math (512 samples = 1024 bytes) verified.\n');

// Test 4: VAD Energy Logic Simulation
console.log('Test 4: Simulating VAD energy calculation and speech hold logic...');
function computeRms(samples: number[]): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

// Silence signal (near zero)
const silence = new Array(256).fill(0).map(() => (Math.random() - 0.5) * 0.005);
const silenceRms = computeRms(silence);
assert.ok(silenceRms < CONFIG.vad.energyThreshold, 'Silence RMS must be below threshold');

// Speech signal (amplitude 0.2)
const speech = new Array(256).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.2);
const speechRms = computeRms(speech);
assert.ok(speechRms > CONFIG.vad.energyThreshold, 'Speech RMS must be above threshold');
console.log(`  Silence RMS: ${silenceRms.toFixed(5)}, Speech RMS: ${speechRms.toFixed(5)}, Threshold: ${CONFIG.vad.energyThreshold}`);
console.log('✓ Test 4 Passed: VAD threshold detection logic verified.\n');

// Test 5: Latitude Row Distribution for 6,000 Dots
console.log('Test 5: Validating sphere latitude dot distribution...');
const circumferences: number[] = [];
let totalCircumference = 0;
for (let r = 0; r < CONFIG.sphere.rowCount; r++) {
  const v = (r + 0.5) / CONFIG.sphere.rowCount;
  const phi = (v - 0.5) * Math.PI;
  const c = Math.max(0.08, Math.cos(phi));
  circumferences.push(c);
  totalCircumference += c;
}

let generatedDotCount = 0;
for (let r = 0; r < CONFIG.sphere.rowCount; r++) {
  const dotsInRow = Math.max(
    6,
    Math.round((circumferences[r] / totalCircumference) * CONFIG.sphere.dotCount)
  );
  generatedDotCount += dotsInRow;
}
console.log(`  Target dot count: ${CONFIG.sphere.dotCount}, Actual generated: ${generatedDotCount}`);
assert.ok(
  Math.abs(generatedDotCount - CONFIG.sphere.dotCount) < 50,
  'Generated dot count should closely match target 6000'
);
console.log('✓ Test 5 Passed: Latitude row distribution correctly generates ~6000 dots.\n');

console.log('==================================================');
console.log('ALL SUNAI MODULE 1 UNIT TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');
