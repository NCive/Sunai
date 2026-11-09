import { CONFIG } from '../config';

export type AudioChunkCallback = (chunk: ArrayBuffer) => void;

/**
 * MicCapture
 * Captures microphone audio at 16 kHz mono with echoCancellation and noiseSuppression.
 * Batches incoming PCM samples into ~100 ms Int16Array buffers for STT streaming.
 * Also provides an AnalyserNode for audio visualization.
 */
export class MicCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
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

    // Request audio stream with strict noise/echo constraints
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: CONFIG.audioCapture.channelCount,
        echoCancellation: CONFIG.audioCapture.echoCancellation,
        noiseSuppression: CONFIG.audioCapture.noiseSuppression,
        autoGainControl: CONFIG.audioCapture.autoGainControl,
      },
    });

    // Create AudioContext at target sample rate (or resample if browser fixes rate)
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({
      sampleRate: CONFIG.audioCapture.sampleRate,
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

    // Setup AnalyserNode for visualizer
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = CONFIG.audioCapture.analyserFftSize;
    this.analyserNode.smoothingTimeConstant = CONFIG.audioCapture.analyserSmoothing;
    this.sourceNode.connect(this.analyserNode);

    // Setup processing node to extract raw PCM
    const bufferSize = 2048;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    const nativeSampleRate = this.audioContext.sampleRate;
    const targetSampleRate = CONFIG.audioCapture.sampleRate;

    this.processorNode.onaudioprocess = (event) => {
      if (!this.running) return;
      const inputData = event.inputBuffer.getChannelData(0);

      // Resample down to 16 kHz if the browser AudioContext runs at 44.1/48 kHz
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

      // Emit chunk once we accumulate the target sample count (~100 ms)
      while (this.sampleBuffer.length >= this.samplesPerChunk) {
        const chunkSamples = this.sampleBuffer.splice(0, this.samplesPerChunk);
        const pcm16 = new Int16Array(chunkSamples.length);
        for (let i = 0; i < chunkSamples.length; i++) {
          // Clamp and scale to signed 16-bit integer
          const s = Math.max(-1, Math.min(1, chunkSamples[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        if (this.onChunk) {
          this.onChunk(pcm16.buffer);
        }
      }
    };

    this.sourceNode.connect(this.processorNode);
    // Connect to destination via silent gain to keep onaudioprocess firing in Chrome
    const muteGain = this.audioContext.createGain();
    muteGain.gain.value = 0;
    this.processorNode.connect(muteGain);
    muteGain.connect(this.audioContext.destination);

    this.running = true;
  }

  public stop(): void {
    this.running = false;
    this.sampleBuffer = [];
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
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

