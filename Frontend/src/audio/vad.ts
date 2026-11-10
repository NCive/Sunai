import { CONFIG } from '../config';

export interface VadEventMetadata {
  durationMs: number;
  peak: number;
  rms: number;
  speechProbability: number;
  isSpectralSpeech: boolean;
}

export type VoiceStartCallback = (meta: VadEventMetadata) => void;
export type VoiceEndCallback = () => void;
export type DuckCallback = (duckVolume: number) => void;
export type RestoreVolumeCallback = () => void;
export type HardPauseCallback = () => void;
export type BlipIgnoredCallback = () => void;

/**
 * BrowserVAD
 * Multi-layer voice activity detector supporting:
 * 1. Neural Silero VAD (@ricky0123/vad-web) running entirely offline via local ONNX/WASM.
 * 2. Two-Stage Interruption Reaction while the bot is SPEAKING:
 *    - Stage 1: Fast ducking of bot playback to 25% with ~40ms ramp (no server message).
 *    - Stage 2: Sustained voice (150-250ms) triggers hard pause, sends vad_start to server.
 *    - Blip cancellation: If sound ends before Stage 2, restores volume and logs noise_blip_ignored.
 * 3. Spectral speech-band filter (300-3400 Hz) rejecting broadband noise (claps, typing) and thumps (<120ms).
 * 4. Adaptive running noise floor with one-click 2-second silence calibration.
 * 5. Energy-based fallback mode.
 */
export class BrowserVAD {
  private analyser: AnalyserNode | null = null;
  private onVoiceStart: VoiceStartCallback | null = null;
  private onVoiceEnd: VoiceEndCallback | null = null;
  private onDuck: DuckCallback | null = null;
  private onRestoreVolume: RestoreVolumeCallback | null = null;
  private onHardPause: HardPauseCallback | null = null;
  private onBlipIgnored: BlipIgnoredCallback | null = null;

  private timerId: number | null = null;
  private isSpeaking = false;
  private isAssistantSpeaking = false;
  private stage1Ducked = false;

  private voiceOnsetCandidateTime: number | null = null;
  private silenceStartTime: number | null = null;

  private currentRms = 0;
  private peakLevel = 0;
  private currentSpeechProb = 0;
  private timeData: Uint8Array | null = null;
  private freqData: Uint8Array | null = null;

  // Adaptive noise floor tracking
  private runningNoiseFloor: number = CONFIG.vad.calibratedNoiseFloor;
  private isCalibrating = false;
  private calibrationSamples: number[] = [];

  // Silero neural VAD instance
  private micVadInstance: any = null;
  private neuralVadActive = false;

  public setAssistantSpeaking(speaking: boolean): void {
    this.isAssistantSpeaking = speaking;
    if (!speaking && this.stage1Ducked) {
      this.restoreVolume();
    }
  }

  public getRunningNoiseFloor(): number {
    return this.runningNoiseFloor;
  }

  public getCurrentEnergy(): number {
    return this.currentRms;
  }

  public getEnergy(): number {
    return this.currentRms;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getCurrentSpeechProbability(): number {
    return this.currentSpeechProb;
  }

  public async start(
    analyser: AnalyserNode,
    onVoiceStart: VoiceStartCallback,
    onVoiceEnd: VoiceEndCallback,
    onDuck?: DuckCallback,
    onRestoreVolume?: RestoreVolumeCallback,
    onHardPause?: HardPauseCallback,
    onBlipIgnored?: BlipIgnoredCallback
  ): Promise<void> {
    this.stop();
    this.analyser = analyser;
    this.onVoiceStart = onVoiceStart;
    this.onVoiceEnd = onVoiceEnd;
    this.onDuck = onDuck || null;
    this.onRestoreVolume = onRestoreVolume || null;
    this.onHardPause = onHardPause || null;
    this.onBlipIgnored = onBlipIgnored || null;

    this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    // Try initializing Neural Silero VAD locally
    if (CONFIG.vad.useNeuralVad && typeof window !== 'undefined') {
      try {
        const { MicVAD } = await import('@ricky0123/vad-web');
        this.micVadInstance = await MicVAD.new({
          baseAssetPath: CONFIG.vad.vadWasmPath,
          onnxWASMBasePath: CONFIG.vad.vadWasmPath,
          model: 'v5',
          ortConfig: (ort: any) => {
            if (ort?.env?.wasm) {
              ort.env.wasm.numThreads = 1;
            }
          },
          onFrameProcessed: (probs: { isSpeech: number }) => {
            this.currentSpeechProb = probs.isSpeech;
          },
        });
        await this.micVadInstance.start();
        this.neuralVadActive = true;
        console.log('[BrowserVAD] Silero Neural VAD running locally.');
      } catch (err) {
        console.warn('[BrowserVAD] Neural VAD initialization failed, using spectral energy fallback:', err);
        this.neuralVadActive = false;
      }
    }

    this.timerId = window.setInterval(() => {
      this.tick();
    }, CONFIG.vad.checkIntervalMs);
  }

  /**
   * Performs 2-second silence calibration to establish baseline room ambient noise floor.
   */
  public async calibrateSilence(): Promise<number> {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    return new Promise((resolve) => {
      const startTime = performance.now();
      const interval = window.setInterval(() => {
        this.calibrationSamples.push(this.currentRms);
        if (performance.now() - startTime >= 2000) {
          window.clearInterval(interval);
          this.isCalibrating = false;
          const avg =
            this.calibrationSamples.length > 0
              ? this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length
              : 0.005;
          this.runningNoiseFloor = Math.max(0.002, avg);
          console.log(`[BrowserVAD] Calibrated noise floor: ${this.runningNoiseFloor.toFixed(4)}`);
          resolve(this.runningNoiseFloor);
        }
      }, 50);
    });
  }

  private duckVolume(): void {
    if (!this.stage1Ducked) {
      this.stage1Ducked = true;
      if (this.onDuck) {
        this.onDuck(CONFIG.vad.duckVolume);
      }
    }
  }

  private restoreVolume(): void {
    if (this.stage1Ducked) {
      this.stage1Ducked = false;
      if (this.onRestoreVolume) {
        this.onRestoreVolume();
      }
    }
  }

  /**
   * Computes energy ratio in the human speech band (300 Hz - 3400 Hz)
   * vs out-of-band high frequency (claps, keystrokes) and low thump (<100 Hz).
   */
  private checkSpeechBand(): boolean {
    if (!this.analyser || !this.freqData) return true;
    this.analyser.getByteFrequencyData(this.freqData as any);

    const sampleRate = CONFIG.audioCapture.sampleRate;
    const binWidth = (sampleRate / 2) / this.freqData.length;

    let speechBandEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < this.freqData.length; i++) {
      const freq = i * binWidth;
      const mag = this.freqData[i];
      totalEnergy += mag;
      if (freq >= CONFIG.vad.speechBandLowHz && freq <= CONFIG.vad.speechBandHighHz) {
        speechBandEnergy += mag;
      }
    }

    if (totalEnergy < 10) return false;
    const speechRatio = speechBandEnergy / totalEnergy;
    // Human speech is concentrated in 300-3400 Hz (ratio >= 0.35)
    return speechRatio >= 0.35;
  }

  private tick(): void {
    if (!this.analyser || !this.timeData) return;

    this.analyser.getByteTimeDomainData(this.timeData as any);

    // Calculate RMS energy and peak
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      const absVal = Math.abs(normalized);
      if (absVal > peak) peak = absVal;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    this.currentRms = rms;
    this.peakLevel = peak;

    const now = performance.now();

    // Continuously update adaptive background noise floor when not speaking
    if (!this.isSpeaking && !this.stage1Ducked && !this.isCalibrating) {
      this.runningNoiseFloor =
        this.runningNoiseFloor * (1 - CONFIG.vad.adaptiveNoiseAlpha) +
        rms * CONFIG.vad.adaptiveNoiseAlpha;
    }

    // Dynamic energy threshold relative to ambient noise floor
    const dynamicBaseThreshold = Math.max(
      CONFIG.vad.energyThreshold,
      this.runningNoiseFloor * 2.2
    );
    const energyThreshold = this.isAssistantSpeaking
      ? Math.max(CONFIG.vad.energyThresholdSpeaking, dynamicBaseThreshold * 1.5)
      : dynamicBaseThreshold;

    const isSpeechBand = this.checkSpeechBand();

    // Determine voice candidate presence
    let hasVoice = false;
    if (this.neuralVadActive) {
      const probThreshold = this.isAssistantSpeaking
        ? CONFIG.vad.speakingSpeechProbThreshold
        : CONFIG.vad.listeningSpeechProbThreshold;
      hasVoice = this.currentSpeechProb >= probThreshold && (rms >= dynamicBaseThreshold || isSpeechBand);
    } else {
      hasVoice = rms >= energyThreshold && isSpeechBand;
    }

    // Minimum sustained duration required
    const minDurationMs = this.isAssistantSpeaking
      ? CONFIG.vad.speakingMinDurationMs
      : CONFIG.vad.listeningMinDurationMs;

    if (hasVoice) {
      this.silenceStartTime = null;

      if (!this.isSpeaking) {
        if (this.voiceOnsetCandidateTime === null) {
          this.voiceOnsetCandidateTime = now;

          // Stage 1: If bot is SPEAKING, duck volume immediately
          if (this.isAssistantSpeaking) {
            this.duckVolume();
          }
        } else {
          const soundDuration = now - this.voiceOnsetCandidateTime;

          // Stage 2: Voice sustained for required duration
          if (soundDuration >= minDurationMs) {
            // Reject sudden spikes shorter than 120ms that immediately die
            this.isSpeaking = true;

            if (this.isAssistantSpeaking && this.onHardPause) {
              this.onHardPause();
            }

            if (this.onVoiceStart) {
              this.onVoiceStart({
                durationMs: soundDuration,
                peak: this.peakLevel,
                rms: this.currentRms,
                speechProbability: this.currentSpeechProb || 0.85,
                isSpectralSpeech: isSpeechBand,
              });
            }
          }
        }
      }
    } else {
      // Sound ceased or dropped below voice threshold
      if (this.voiceOnsetCandidateTime !== null && !this.isSpeaking) {
        const soundDuration = now - this.voiceOnsetCandidateTime;
        // Sound ended before reaching Stage 2: noise blip!
        if (this.isAssistantSpeaking) {
          this.restoreVolume();
          if (this.onBlipIgnored) {
            this.onBlipIgnored();
          }
          console.log(`[BrowserVAD] Sound blip ignored: duration=${soundDuration.toFixed(0)}ms, peak=${this.peakLevel.toFixed(3)}, prob=${this.currentSpeechProb.toFixed(2)}`);
        }
        this.voiceOnsetCandidateTime = null;
      }

      if (this.isSpeaking) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= CONFIG.vad.speechHoldMs) {
          this.isSpeaking = false;
          this.silenceStartTime = null;
          this.voiceOnsetCandidateTime = null;
          this.restoreVolume();
          if (this.onVoiceEnd) {
            this.onVoiceEnd();
          }
        }
      }
    }
  }

  public stop(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.micVadInstance) {
      try {
        this.micVadInstance.pause();
      } catch {}
      this.micVadInstance = null;
    }
    this.isSpeaking = false;
    this.stage1Ducked = false;
    this.voiceOnsetCandidateTime = null;
    this.silenceStartTime = null;
    this.analyser = null;
    this.neuralVadActive = false;
  }
}
