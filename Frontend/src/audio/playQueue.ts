import { CONFIG } from '../config';

export interface PlayQueueItem {
  sentenceId: number | string;
  turnId?: number;
  kind?: 'sentence' | 'filler';
  audioData: ArrayBuffer;
}

export type SentenceFinishedCallback = (
  sentenceId: number | string,
  turnId?: number,
  kind?: string
) => void;

/**
 * PlayQueue
 * Manages an ordered queue of audio sentences.
 * Supports immediate pause, resume, clear, and filler abortion.
 * Exposes an AnalyserNode connected to the active playback chain for visualizer consumption.
 */
export class PlayQueue {
  private queue: PlayQueueItem[] = [];
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPaused = false;
  private isPlaying = false;
  private activeSentenceId: number | string | null = null;
  private activeItem: PlayQueueItem | null = null;
  private onSentenceFinishedCallback: SentenceFinishedCallback | null = null;
  private currentTurnId: number = 0;
  private epoch: number = 0;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = CONFIG.playQueue.analyserFftSize;
    this.analyserNode.smoothingTimeConstant = CONFIG.playQueue.analyserSmoothing;

    // Connect: source -> gainNode -> analyserNode -> destination
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }

  public setOnSentenceFinished(callback: SentenceFinishedCallback): void {
    this.onSentenceFinishedCallback = callback;
  }

  public setTurnId(turnId: number): void {
    if (turnId > this.currentTurnId) {
      this.currentTurnId = turnId;
    }
  }

  public async enqueue(item: PlayQueueItem): Promise<void> {
    if (typeof item.turnId === 'number' && item.turnId < this.currentTurnId) {
      console.warn(`[PlayQueue] Dropping clip with older turnId ${item.turnId} (current=${this.currentTurnId})`);
      return;
    }
    this.initAudioContext();
    this.queue.push(item);
    if (!this.isPlaying && !this.isPaused) {
      await this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.isPaused || this.queue.length === 0 || !this.audioContext || !this.gainNode) {
      this.isPlaying = false;
      this.activeSentenceId = null;
      return;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const runEpoch = this.epoch;
    this.isPlaying = true;
    const nextItem = this.queue.shift()!;

    if (typeof nextItem.turnId === 'number' && nextItem.turnId < this.currentTurnId) {
      console.warn(`[PlayQueue] Discarding stale queued item (turn ${nextItem.turnId} < current ${this.currentTurnId})`);
      await this.playNext();
      return;
    }

    this.activeSentenceId = nextItem.sentenceId;
    this.activeItem = nextItem;

    try {
      // Decode audio data (clone buffer since decodeAudioData detaches ArrayBuffer)
      const bufferCopy = nextItem.audioData.slice(0);
      const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);

      if (this.epoch !== runEpoch) {
        // Queue cleared during async decode: drop stale audio without re-queueing
        console.log(`[PlayQueue] Dropping decoded audio from cancelled epoch ${runEpoch} (current=${this.epoch})`);
        return;
      }

      if (this.isPaused) {
        // Paused while decoding; put back into queue
        this.queue.unshift(nextItem);
        this.isPlaying = false;
        return;
      }

      if (!this.isPlaying) {
        return;
      }

      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.gainNode);

      this.currentSource.onended = () => {
        const finishedId = this.activeSentenceId;
        const finishedTurnId = this.activeItem?.turnId;
        const finishedKind = this.activeItem?.kind;
        this.currentSource = null;
        this.activeSentenceId = null;
        this.activeItem = null;

        if (finishedId !== null && this.onSentenceFinishedCallback) {
          this.onSentenceFinishedCallback(finishedId, finishedTurnId, finishedKind);
        }

        if (!this.isPaused) {
          this.playNext();
        }
      };

      this.currentSource.start(0);
    } catch (err) {
      console.error('[PlayQueue] Failed to decode or play audio item:', err);
      // Skip bad audio item and try next
      this.playNext();
    }
  }

  /**
   * Immediately aborts any playing filler clip ("please wait", etc.) when
   * a real answer sentence arrives, so the user hears the answer without delay.
   */
  public stopCurrentIfFiller(): boolean {
    if (this.activeItem && (this.activeItem.kind === 'filler' || this.activeItem.sentenceId === 0)) {
      console.log('[PlayQueue] Stopping active filler clip to prioritize real answer sentence.');
      if (this.currentSource) {
        try {
          this.currentSource.onended = null;
          this.currentSource.stop();
          this.currentSource.disconnect();
        } catch {
          // Ignore if already stopped
        }
        this.currentSource = null;
      }
      this.activeItem = null;
      this.activeSentenceId = null;
      this.isPlaying = false;
      // Discard any other queued filler items
      this.queue = this.queue.filter((item) => item.kind !== 'filler' && item.sentenceId !== 0);
      return true;
    }
    return false;
  }

  /**
   * Immediate pause: suspends the AudioContext instantly.
   */
  public async pause(): Promise<void> {
    if (!this.audioContext || this.isPaused) return;
    this.isPaused = true;
    if (this.audioContext.state === 'running') {
      await this.audioContext.suspend();
    }
  }

  /**
   * Resume playback from the exact pause point.
   */
  public async resume(): Promise<void> {
    if (!this.audioContext || !this.isPaused) return;
    this.isPaused = false;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (!this.isPlaying && this.queue.length > 0) {
      await this.playNext();
    }
  }

  /**
   * Clears the remaining queue and stops current playback immediately.
   */
  public clear(newTurnId?: number): void {
    this.epoch += 1;
    if (typeof newTurnId === 'number' && newTurnId > this.currentTurnId) {
      this.currentTurnId = newTurnId;
    }
    this.queue = [];
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.activeSentenceId = null;
    this.activeItem = null;
    this.isPaused = false;
  }

  // Compatibility stubs
  public duck(_volume?: number): void {}
  public unduck(): void {}

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getActiveSentenceId(): number | string | null {
    return this.activeSentenceId;
  }
}
