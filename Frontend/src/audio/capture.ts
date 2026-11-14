import { CONFIG } from '../config';

export type AudioChunkCallback = (chunk: ArrayBuffer) => void;

/**
 * MicCapture
 * High-performance, low-latency audio capture path using AudioWorklet:
 * 1. Captures microphone audio using native browser constraints:
 *    - echoCancellation: true
 *    - noiseSuppression: true
 *    - autoGainControl: false (prevents AGC from boosting ambient room noise)
 * 2. Audio sent to STT:
 *    - Pure, unmodified 16 kHz mono 16-bit PCM audio stream sent directly to Prisma.
 *    - Captured via AudioWorkletNode running SunaiWorkletProcessor in 512-sample (32 ms, 1024 bytes) chunks.
 *    - Validates AudioContext sample rate and resamples to 16 kHz if native hardware forces 44.1/48 kHz.
 *    - NO noise gating (never replaces user voice with silence).
 *    - NO destructive filtering or pre-roll truncation on the speech stream.
 * 3. VAD Analysis Branch ONLY:
 *    - Gentle 60 Hz high-pass filter (BiquadFilterNode) applied exclusively to the
 *      analyser branch used by VAD energy calculations. This removes desk thumps
 *      and low-frequency rumble from trigger energy without altering what Prisma STT hears.
 * 4. Fallback:
 *    - If AudioWorklet is unsupported or fails to load, gracefully falls back to ScriptProcessor.
 */
export class MicCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private vadFilterNode: BiquadFilterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private muteGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private onChunk: AudioChunkCallback | null = null;
  private sampleBuffer: number[] = [];
  private resamplePhase = 0;
  private samplesPerChunk: number;
  private running = false;

  constructor() {
    this.samplesPerChunk = CONFIG.audioCapture.chunkSamples ?? 512;
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

    // Create AudioContext at target sample rate (16000 Hz)
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({
      sampleRate: CONFIG.audioCapture.sampleRate,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const nativeSampleRate = this.audioContext.sampleRate;
    const targetSampleRate = CONFIG.audioCapture.sampleRate;
    if (nativeSampleRate !== targetSampleRate) {
      console.warn(
        `[MicCapture] AudioContext sampleRate is ${nativeSampleRate}Hz, expected ${targetSampleRate}Hz. Resampling to ${targetSampleRate}Hz.`
      );
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    // Setup AnalyserNode for VAD and sphere visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = CONFIG.audioCapture.analyserFftSize;
    this.analyserNode.smoothingTimeConstant = CONFIG.audioCapture.analyserSmoothing;

    // High-pass filter applied ONLY to the VAD/visualizer branch
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
      console.warn('[MicCapture] Failed to attach VAD high-pass filter, connecting directly:', err);
      this.sourceNode.connect(this.analyserNode);
    }

    // Direct path to STT: UNFILTERED raw audio sent to Prisma
    let workletInitialized = false;
    const hasAudioWorklet =
      typeof AudioWorkletNode !== 'undefined' &&
      !!this.audioContext.audioWorklet &&
      typeof this.audioContext.audioWorklet.addModule === 'function';

    if (hasAudioWorklet) {
      try {
        await this.audioContext.audioWorklet.addModule('/worklet-processor.js');
        this.workletNode = new AudioWorkletNode(this.audioContext, 'sunai-worklet-processor');
        this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
          if (!this.running) return;
          this.processFloat32Samples(event.data, nativeSampleRate, targetSampleRate);
        };

        this.sourceNode.connect(this.workletNode);

        // Keepalive mute gain node
        const muteGain = this.audioContext.createGain();
        muteGain.gain.value = 0;
        this.workletNode.connect(muteGain);
        muteGain.connect(this.audioContext.destination);
        this.muteGainNode = muteGain;

        workletInitialized = true;
      } catch (err) {
        console.warn('[MicCapture] AudioWorklet failed to load or start, falling back to ScriptProcessor:', err);
      }
    } else {
      console.warn('[MicCapture] AudioWorklet is not supported, falling back to ScriptProcessor.');
    }

    if (!workletInitialized) {
      this.setupScriptProcessorFallback(nativeSampleRate, targetSampleRate);
    }

    this.running = true;
  }

  private setupScriptProcessorFallback(
    nativeSampleRate: number,
    targetSampleRate: number
  ): void {
    if (!this.audioContext || !this.sourceNode) return;
    const bufferSize = 2048;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      if (!this.running) return;
      const inputData = event.inputBuffer.getChannelData(0);
      this.processFloat32Samples(inputData, nativeSampleRate, targetSampleRate);
    };

    this.sourceNode.connect(this.processorNode);

    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;
    this.processorNode.connect(muteGain);
    muteGain.connect(this.audioContext.destination);
    this.muteGainNode = muteGain;
  }

  private processFloat32Samples(
    inputData: Float32Array,
    nativeSampleRate: number,
    targetSampleRate: number
  ): void {
    if (nativeSampleRate === targetSampleRate) {
      for (let i = 0; i < inputData.length; i++) {
        this.sampleBuffer.push(inputData[i]);
      }
    } else {
      const ratio = nativeSampleRate / targetSampleRate;
      while (this.resamplePhase < inputData.length) {
        const idx = Math.floor(this.resamplePhase);
        this.sampleBuffer.push(inputData[idx]);
        this.resamplePhase += ratio;
      }
      this.resamplePhase -= inputData.length;
    }

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
  }

  public setVoiceActive(_active: boolean): void {
    // Kept as no-op for backward compatibility (no noise gating)
  }

  public stop(): void {
    this.running = false;
    this.sampleBuffer = [];
    this.resamplePhase = 0;

    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.port.close();
      } catch {
        // ignore
      }
      try {
        this.workletNode.disconnect();
      } catch {
        // ignore
      }
      this.workletNode = null;
    }

    if (this.processorNode) {
      try {
        this.processorNode.onaudioprocess = null;
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }

    if (this.muteGainNode) {
      try {
        this.muteGainNode.disconnect();
      } catch {
        // ignore
      }
      this.muteGainNode = null;
    }

    if (this.vadFilterNode) {
      try {
        this.vadFilterNode.disconnect();
      } catch {
        // ignore
      }
      this.vadFilterNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.stream) {
      try {
        this.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      this.stream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.analyserNode = null;
    this.onChunk = null;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public isActive(): boolean {
    return this.running;
  }
}
