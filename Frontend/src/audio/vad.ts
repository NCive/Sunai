import { CONFIG } from '../config';

export interface VadEventMetadata {
  durationMs: number;
  rms: number;
}

export type VoiceStartCallback = (meta?: VadEventMetadata) => void;
export type VoiceEndCallback = () => void;

/**
 * BrowserVAD
 * Clean energy-based Voice Activity Detector with light noise rejection:
 * - Single baseline energy threshold (CONFIG.vad.energyThreshold, not raised while speaking).
 * - Minimum voice duration (CONFIG.vad.minVoiceDurationMs = 120ms) before pausing:
 *   filters out single-frame clicks, desk taps, and keyboard transient spikes.
 * - Silence hold period (CONFIG.vad.speechHoldMs = 350ms) before signaling speech end.
 * - Fail-open design: gracefully recovers from any audio buffer errors.
 */
export class BrowserVAD {
  private analyser: AnalyserNode | null = null;
  private onVoiceStart: VoiceStartCallback | null = null;
  private onVoiceEnd: VoiceEndCallback | null = null;

  private timerId: number | null = null;
  private isSpeaking = false;
  private isAssistantSpeaking = false;

  private voiceStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  private currentEnergy = 0;
  private timeData: Uint8Array | null = null;

  public setAssistantSpeaking(speaking: boolean): void {
    this.isAssistantSpeaking = speaking;
  }

  public getIsAssistantSpeaking(): boolean {
    return this.isAssistantSpeaking;
  }

  public getEnergy(): number {
    return this.currentEnergy;
  }

  public getCurrentEnergy(): number {
    return this.currentEnergy;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getCurrentSpeechProbability(): number {
    return this.isSpeaking ? 1.0 : 0.0;
  }

  public start(
    analyser: AnalyserNode,
    onVoiceStart: VoiceStartCallback,
    onVoiceEnd: VoiceEndCallback
  ): void {
    this.stop();
    this.analyser = analyser;
    this.onVoiceStart = onVoiceStart;
    this.onVoiceEnd = onVoiceEnd;
    this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));

    this.timerId = window.setInterval(() => {
      this.tick();
    }, CONFIG.vad.checkIntervalMs);
  }

  private tick(): void {
    try {
      if (!this.analyser || !this.timeData) return;

      this.analyser.getByteTimeDomainData(this.timeData as any);

      // Compute normalized RMS energy
      let sumSquares = 0;
      for (let i = 0; i < this.timeData.length; i++) {
        const normalized = (this.timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / this.timeData.length);
      this.currentEnergy = rms;

      const now = performance.now();
      const threshold = CONFIG.vad.energyThreshold;
      const minDurationMs = CONFIG.vad.minVoiceDurationMs;

      if (rms >= threshold) {
        this.silenceStartTime = null;

        if (!this.isSpeaking) {
          if (this.voiceStartTime === null) {
            this.voiceStartTime = now;
          } else if (now - this.voiceStartTime >= minDurationMs) {
            // Sustained continuous voice for >= minVoiceDurationMs (120ms): trigger voice start!
            this.isSpeaking = true;
            if (this.onVoiceStart) {
              this.onVoiceStart({
                durationMs: now - this.voiceStartTime,
                rms: this.currentEnergy,
              });
            }
          }
        }
      } else {
        // Energy dropped below threshold: if voice onset candidate hadn't reached 120ms, cancel it (tap/click filtered out)
        if (this.voiceStartTime !== null && !this.isSpeaking) {
          this.voiceStartTime = null;
        }

        if (this.isSpeaking) {
          if (this.silenceStartTime === null) {
            this.silenceStartTime = now;
          } else if (now - this.silenceStartTime >= CONFIG.vad.speechHoldMs) {
            this.isSpeaking = false;
            this.silenceStartTime = null;
            this.voiceStartTime = null;
            if (this.onVoiceEnd) {
              this.onVoiceEnd();
            }
          }
        }
      }
    } catch (err) {
      // Fail-open: continue running without throwing
      console.warn('[BrowserVAD] Error during tick:', err);
    }
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isSpeaking = false;
    this.voiceStartTime = null;
    this.silenceStartTime = null;
    this.currentEnergy = 0;
    this.analyser = null;
    this.timeData = null;
  }
}
