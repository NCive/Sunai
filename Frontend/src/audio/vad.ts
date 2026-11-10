import { CONFIG } from '../config';

export type VoiceEventCallback = () => void;

/**
 * BrowserVAD
 * Energy-based voice activity detector that processes time-domain audio data
 * from the microphone's AnalyserNode.
 * Emits onVoiceStart when speech energy crosses the threshold and
 * onVoiceEnd after a hold period of continuous silence.
 */
export class BrowserVAD {
  private analyser: AnalyserNode | null = null;
  private onVoiceStart: VoiceEventCallback | null = null;
  private onVoiceEnd: VoiceEventCallback | null = null;
  private timerId: number | null = null;
  private isSpeaking = false;
  private speechStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  private currentEnergy = 0;
  private timeData: Uint8Array | null = null;
  private isAssistantSpeaking = false;

  public setAssistantSpeaking(speaking: boolean): void {
    this.isAssistantSpeaking = speaking;
  }

  public start(
    analyser: AnalyserNode,
    onVoiceStart: VoiceEventCallback,
    onVoiceEnd: VoiceEventCallback
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
    if (!this.analyser || !this.timeData) return;

    this.analyser.getByteTimeDomainData(this.timeData as any);

    // Calculate RMS energy normalized between 0.0 and 1.0
    let sumSquares = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    this.currentEnergy = rms;

    const now = performance.now();
    const threshold = this.isAssistantSpeaking
      ? CONFIG.vad.energyThresholdSpeaking
      : CONFIG.vad.energyThreshold;

    if (rms >= threshold) {
      this.silenceStartTime = null;

      if (!this.isSpeaking) {
        if (this.speechStartTime === null) {
          this.speechStartTime = now;
        } else if (now - this.speechStartTime >= CONFIG.vad.minSpeechDurationMs) {
          this.isSpeaking = true;
          if (this.onVoiceStart) {
            this.onVoiceStart();
          }
        }
      }
    } else {
      this.speechStartTime = null;

      if (this.isSpeaking) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= CONFIG.vad.speechHoldMs) {
          this.isSpeaking = false;
          this.silenceStartTime = null;
          if (this.onVoiceEnd) {
            this.onVoiceEnd();
          }
        }
      }
    }
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    this.currentEnergy = 0;
    this.analyser = null;
    this.timeData = null;
  }

  public getEnergy(): number {
    return this.currentEnergy;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
