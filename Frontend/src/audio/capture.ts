import { CONFIG } from '../config';

export type AudioChunkCallback = (chunk: ArrayBuffer, peak: number, clipping: boolean) => void;

const WORKLET_PROCESSOR_CODE = `
class MicAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 100 Hz High-Pass Filter: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
    // fc = 100 Hz, fs = 16000 Hz -> alpha ~ 0.9622
    this.alpha = 0.9622;
    this.prevX = 0;
    this.prevY = 0;
    this.buffer = [];
    this.samplesPerChunk = 1600; // 100 ms at 16 kHz
    this.clipCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      const x = channel[i];
      if (Math.abs(x) >= 0.985) {
        this.clipCount++;
      }
      // 100 Hz High-pass filter
      const y = this.alpha * (this.prevY + x - this.prevX);
      this.prevX = x;
      this.prevY = y;
      this.buffer.push(y);
    }

    while (this.buffer.length >= this.samplesPerChunk) {
      const chunk = this.buffer.splice(0, this.samplesPerChunk);
      const pcm16 = new Int16Array(chunk.length);
      let peak = 0;
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        const absS = Math.abs(s);
        if (absS > peak) peak = absS;
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(
        {
          pcm16: pcm16.buffer,
          peak: peak,
          clipping: this.clipCount > 0,
        },
        [pcm16.buffer]
      );
      this.clipCount = 0;
    }

    return true;
  }
}
registerProcessor('mic-audio-processor', MicAudioProcessor);
`;

/**
 * MicCapture
 * Captures microphone audio using modern AudioWorkletNode at 16 kHz mono.
 * Includes:
 * - 100 Hz high-pass filter to remove low-frequency rumble
 * - Peak level and clipping monitoring
 * - Configurable autoGainControl (default off)
 * - VAD noise gating with 300ms pre-roll and 400ms hangover
 */
export class MicCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private fallbackProcessorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private onChunk: AudioChunkCallback | null = null;

  private running = false;
  private isVoiceActive = false;
  private hangoverRemainingChunks = 0;
  private preRollBuffer: ArrayBuffer[] = [];
  private maxPreRollChunks = 3; // 300 ms at 100ms/chunk
  private hangoverChunks = 4; // 400 ms at 100ms/chunk

  constructor() {
    this.maxPreRollChunks = Math.max(1, Math.round(CONFIG.audioCapture.noiseGatePreRollMs / CONFIG.audioCapture.chunkDurationMs));
    this.hangoverChunks = Math.max(1, Math.round(CONFIG.audioCapture.noiseGateHangoverMs / CONFIG.audioCapture.chunkDurationMs));
  }

  public setVoiceActive(active: boolean): void {
    if (this.isVoiceActive && !active) {
      // Speech just ended: initiate hangover period
      this.hangoverRemainingChunks = this.hangoverChunks;
    } else if (!this.isVoiceActive && active) {
      // Speech started: flush pre-roll buffer
      if (CONFIG.audioCapture.noiseGatingEnabled && this.onChunk) {
        for (const chunk of this.preRollBuffer) {
          this.onChunk(chunk, 0.05, false);
        }
      }
      this.preRollBuffer = [];
      this.hangoverRemainingChunks = 0;
    }
    this.isVoiceActive = active;
  }

  public async start(onChunk: AudioChunkCallback): Promise<void> {
    if (this.running) return;
    this.onChunk = onChunk;

    // Verify browser media devices support and secure context
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        throw new Error(
          'Microphone requires a Secure Context. You are accessing via an insecure HTTP IP address. Please open http://localhost:5173 or http://127.0.0.1:5173 instead.'
        );
      }
      throw new Error(
        'navigator.mediaDevices.getUserMedia is undefined. Ensure microphone permissions are enabled and you are using a modern browser on localhost or HTTPS.'
      );
    }

    // Request audio stream with strict noise/echo constraints
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: CONFIG.audioCapture.channelCount,
        echoCancellation: CONFIG.audioCapture.echoCancellation,
        noiseSuppression: CONFIG.audioCapture.noiseSuppression,
        autoGainControl: CONFIG.audioCapture.autoGainControl,
      },
    });

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

    // Setup AnalyserNode for visualizer
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = CONFIG.audioCapture.analyserFftSize;
    this.analyserNode.smoothingTimeConstant = CONFIG.audioCapture.analyserSmoothing;
    this.sourceNode.connect(this.analyserNode);

    // Attempt to initialize modern AudioWorkletNode
    let workletLoaded = false;
    try {
      if (this.audioContext.audioWorklet) {
        const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        this.workletNode = new AudioWorkletNode(this.audioContext, 'mic-audio-processor');
        this.workletNode.port.onmessage = (event) => {
          this.handleProcessedChunk(event.data.pcm16, event.data.peak, event.data.clipping);
        };

        this.sourceNode.connect(this.workletNode);
        const muteGain = this.audioContext.createGain();
        muteGain.gain.value = 0;
        this.workletNode.connect(muteGain);
        muteGain.connect(this.audioContext.destination);

        workletLoaded = true;
        console.log('[MicCapture] AudioWorkletNode initialized at 16 kHz with 100 Hz high-pass filter.');
      }
    } catch (err) {
      console.warn('[MicCapture] AudioWorklet initialization failed, falling back to ScriptProcessor:', err);
      workletLoaded = false;
    }

    // Fallback to ScriptProcessor if AudioWorklet unavailable in browser
    if (!workletLoaded) {
      const bufferSize = 2048;
      this.fallbackProcessorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      const samplesPerChunk = Math.round(
        (CONFIG.audioCapture.sampleRate * CONFIG.audioCapture.chunkDurationMs) / 1000
      );
      let sampleBuffer: number[] = [];

      this.fallbackProcessorNode.onaudioprocess = (event) => {
        if (!this.running) return;
        const inputData = event.inputBuffer.getChannelData(0);
        let peak = 0;
        let clipping = false;

        for (let i = 0; i < inputData.length; i++) {
          const s = inputData[i];
          const absS = Math.abs(s);
          if (absS > peak) peak = absS;
          if (absS >= 0.985) clipping = true;
          sampleBuffer.push(s);
        }

        while (sampleBuffer.length >= samplesPerChunk) {
          const chunkSamples = sampleBuffer.splice(0, samplesPerChunk);
          const pcm16 = new Int16Array(chunkSamples.length);
          for (let i = 0; i < chunkSamples.length; i++) {
            const s = Math.max(-1, Math.min(1, chunkSamples[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          this.handleProcessedChunk(pcm16.buffer, peak, clipping);
        }
      };

      this.sourceNode.connect(this.fallbackProcessorNode);
      const muteGain = this.audioContext.createGain();
      muteGain.gain.value = 0;
      this.fallbackProcessorNode.connect(muteGain);
      muteGain.connect(this.audioContext.destination);
    }

    this.running = true;
  }

  private handleProcessedChunk(pcm16Buffer: ArrayBuffer, peak: number, clipping: boolean): void {
    if (!this.running || !this.onChunk) return;

    if (clipping) {
      console.warn(`[MicCapture] Audio clipping detected! Peak level: ${(peak * 100).toFixed(1)}%`);
    }

    // Check noise gating
    if (!CONFIG.audioCapture.noiseGatingEnabled) {
      this.onChunk(pcm16Buffer, peak, clipping);
      return;
    }

    if (this.isVoiceActive) {
      // Voice is currently active: send real audio
      this.onChunk(pcm16Buffer, peak, clipping);
    } else if (this.hangoverRemainingChunks > 0) {
      // Hangover period: send real audio
      this.hangoverRemainingChunks--;
      this.onChunk(pcm16Buffer, peak, clipping);
    } else {
      // Non-speech silence: keep pre-roll buffer fresh
      this.preRollBuffer.push(pcm16Buffer.slice(0));
      if (this.preRollBuffer.length > this.maxPreRollChunks) {
        this.preRollBuffer.shift();
      }
      // Send zeros to Prisma so timing is preserved without background noise
      const silenceChunk = new Int16Array(1600).buffer;
      this.onChunk(silenceChunk, 0.0, false);
    }
  }

  public stop(): void {
    this.running = false;
    this.preRollBuffer = [];
    this.hangoverRemainingChunks = 0;

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.fallbackProcessorNode) {
      this.fallbackProcessorNode.disconnect();
      this.fallbackProcessorNode = null;
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
}
