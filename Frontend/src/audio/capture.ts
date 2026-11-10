import { CONFIG } from '../config';

export type AudioChunkCallback = (chunk: ArrayBuffer) => void;

/**
 * MicCapture
 * Restored reliable audio capture path:
 * 1. Captures microphone audio using native browser constraints:
 *    - echoCancellation: true
 *    - noiseSuppression: true
 *    - autoGainControl: false (prevents AGC from boosting ambient room noise)
 * 2. Audio sent to STT:
 *    - Pure, unmodified 16 kHz mono 16-bit PCM audio stream sent directly to Prisma.
 *    - NO noise gating (never replaces user voice with silence).
 *    - NO destructive filtering or pre-roll truncation on the speech stream.
 * 3. VAD Analysis Branch ONLY:
 *    - Gentle 80 Hz high-pass filter (BiquadFilterNode) applied exclusively to the
 *      analyser branch used by VAD energy calculations. This removes desk thumps
 *      and low-frequency rumble from trigger energy without altering what Prisma STT hears.
 */
export class MicCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private vadFilterNode: BiquadFilterNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private onChunk: AudioChunkCallback | null = null;
  private sampleBuffer: number[] = [];
  private samplesPerChunk: number;
  private running = false;

  constructor() {
    this.samplesPerChunk = Math.round(
      (CONFIG.audioCapture.sampleRate * CONFIG.audioCapture.chunkDurationMs) / 1000
    );
  }

  public async start(onChunk: AudioChunkCallback): Promise<void> {
    if (this.running) return;
    this.onChunk = onChunk;

    // Request audio stream with native constraints
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: CONFIG.audioCapture.channelCount,
        echoCancellation: CONFIG.audioCapture.echoCancellation,
        noiseSuppression: CONFIG.audioCapture.noiseSuppression,
        autoGainControl: CONFIG.audioCapture.autoGainControl,
      },
    });

    // Create AudioContext at target sample rate
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({
      sampleRate: CONFIG.audioCapture.sampleRate,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    // Setup AnalyserNode for VAD and sphere visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = CONFIG.audioCapture.analyserFftSize;
    this.analyserNode.smoothingTimeConstant = CONFIG.audioCapture.analyserSmoothing;

    // High-pass filter (80 Hz) applied ONLY to the VAD/visualizer branch (Item 3)
    try {
      if (CONFIG.vad.highPassFilterEnabled) {
        this.vadFilterNode = this.audioContext.createBiquadFilter();
        this.vadFilterNode.type = 'highpass';
        this.vadFilterNode.frequency.value = CONFIG.vad.highPassFilterHz;
        this.vadFilterNode.Q.value = 0.707;
        this.sourceNode.connect(this.vadFilterNode);
        this.vadFilterNode.connect(this.analyserNode);
      } else {
        this.sourceNode.connect(this.analyserNode);
      }
    } catch (err) {
      // Fail-open: connect directly if filter creation fails
      console.warn('[MicCapture] Failed to attach VAD high-pass filter, connecting directly:', err);
      this.sourceNode.connect(this.analyserNode);
    }

    // Direct path to STT processor node: UNALTERED raw audio sent to Prisma
    const bufferSize = 2048;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    const nativeSampleRate = this.audioContext.sampleRate;
    const targetSampleRate = CONFIG.audioCapture.sampleRate;

    this.processorNode.onaudioprocess = (event) => {
      if (!this.running) return;
      const inputData = event.inputBuffer.getChannelData(0);

      // Resample down to 16 kHz if browser forced 44.1 / 48 kHz
      if (nativeSampleRate === targetSampleRate) {
        for (let i = 0; i < inputData.length; i++) {
          this.sampleBuffer.push(inputData[i]);
        }
      } else {
        const ratio = nativeSampleRate / targetSampleRate;
        for (let i = 0; i < inputData.length; i += ratio) {
          const index = Math.floor(i);
          this.sampleBuffer.push(inputData[index]);
        }
      }

      // Emit ~100 ms PCM16 chunks
      while (this.sampleBuffer.length >= this.samplesPerChunk) {
        const chunkSamples = this.sampleBuffer.splice(0, this.samplesPerChunk);
        const pcm16 = new Int16Array(chunkSamples.length);
        for (let i = 0; i < chunkSamples.length; i++) {
          const s = Math.max(-1, Math.min(1, chunkSamples[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        if (this.onChunk) {
          this.onChunk(pcm16.buffer);
        }
      }
    };

    this.sourceNode.connect(this.processorNode);

    // Mute gain keepalive for Chrome ScriptProcessor
    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;
    this.processorNode.connect(muteGain);
    muteGain.connect(this.audioContext.destination);

    this.running = true;
  }

  public setVoiceActive(_active: boolean): void {
    // Kept as no-op for backward compatibility (no noise gating)
  }

  public stop(): void {
    this.running = false;
    this.sampleBuffer = [];
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.vadFilterNode) {
      this.vadFilterNode.disconnect();
      this.vadFilterNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyserNode = null;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public isActive(): boolean {
    return this.running;
  }
}
