import { CONFIG } from '../config';

export interface PlayQueueItem {
  sentenceId: number | string;
  turnId?: number;
  kind?: 'sentence' | 'filler';
  audioData: ArrayBuffer; // Encoded audio (WAV, MP3) or decodable buffer
}

export type SentenceFinishedCallback = (sentenceId: number | string, turnId?: number, kind?: string) => void;

/**
 * PlayQueue
 * Manages an ordered queue of audio sentences with strict single-playhead enforcement,
 * epoch-based invalidation across turn interruptions, zero audio leakage, and smooth gain ramps.
 */
export class PlayQueue {
  private queue: PlayQueueItem[] = [];
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private activeNodes: Set<AudioBufferSourceNode> = new Set();
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPaused = false;
  private isPlaying = false;
  private isDecoding = false;
  private currentEpoch = 0;
  private activeSentenceId: number | string | null = null;
  private activeItem: PlayQueueItem | null = null;
  private onSentenceFinishedCallback: SentenceFinishedCallback | null = null;

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

  public async enqueue(item: PlayQueueItem): Promise<void> {
    this.initAudioContext();
    this.queue.push(item);
    if (!this.isPlaying && !this.isPaused && !this.isDecoding) {
      await this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    // Single playhead guard: only one item may be decoding or playing at any moment
    if (this.isPaused || this.isDecoding || this.queue.length === 0 || !this.audioContext || !this.gainNode) {
      if (this.queue.length === 0) {
        this.isPlaying = false;
        this.activeSentenceId = null;
      }
      return;
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (err) {
        console.warn('[PlayQueue] Failed to resume AudioContext:', err);
      }
    }

    this.isDecoding = true;
    const itemEpoch = this.currentEpoch;
    const nextItem = this.queue.shift()!;

    try {
      // Decode audio data (clone buffer since decodeAudioData detaches ArrayBuffer)
      const bufferCopy = nextItem.audioData.slice(0);
      const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
      this.isDecoding = false;

      // Crucial Fix: Check if epoch changed while decode was in flight (e.g. clear() called)
      if (itemEpoch !== this.currentEpoch) {
        console.log(
          `[PlayQueue] Dropping decoded audio for sentence ${nextItem.sentenceId} from expired epoch ${itemEpoch} (current=${this.currentEpoch}).`
        );
        // Do NOT put back in queue! Drop immediately and exit.
        return;
      }

      if (this.isPaused) {
        // Paused while decoding: preserve for resume
        this.queue.unshift(nextItem);
        return;
      }

      // Mark playback active
      this.isPlaying = true;
      this.activeSentenceId = nextItem.sentenceId;
      this.activeItem = nextItem;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);
      this.activeNodes.add(source);
      this.currentSource = source;

      source.onended = () => {
        this.activeNodes.delete(source);
        if (this.currentSource === source) {
          this.currentSource = null;
        }

        // Ignore completion callback if epoch changed
        if (itemEpoch !== this.currentEpoch) {
          return;
        }

        const finishedId = this.activeSentenceId;
        const finishedTurnId = this.activeItem?.turnId;
        const finishedKind = this.activeItem?.kind;
        this.activeSentenceId = null;
        this.activeItem = null;
        this.isPlaying = false;

        if (finishedId !== null && this.onSentenceFinishedCallback) {
          this.onSentenceFinishedCallback(finishedId, finishedTurnId, finishedKind);
        }

        if (!this.isPaused) {
          this.playNext();
        }
      };

      source.start(0);
    } catch (err) {
      this.isDecoding = false;
      console.error('[PlayQueue] Failed to decode or play audio item:', err);
      // Skip bad audio item and try next if epoch is still current
      if (itemEpoch === this.currentEpoch) {
        this.isPlaying = false;
        this.playNext();
      }
    }
  }

  /**
   * Immediately cuts off any playing filler clip ("please wait", etc.) when
   * a real answer sentence arrives, fading out over 50 ms to avoid clicks.
   */
  public stopCurrentIfFiller(): boolean {
    if (this.activeItem && (this.activeItem.kind === 'filler' || this.activeItem.sentenceId === 0)) {
      console.log('[PlayQueue] Fading out active filler clip over 50ms to prioritize real answer sentence.');
      const node = this.currentSource;
      if (node && this.audioContext && this.gainNode) {
        try {
          const now = this.audioContext.currentTime;
          this.gainNode.gain.cancelScheduledValues(now);
          this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
          this.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.050);
          node.stop(now + 0.050);
          setTimeout(() => {
            try {
              node.disconnect();
            } catch {
              // Ignore
            }
            if (this.gainNode && this.audioContext) {
              this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
              this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
            }
          }, 55);
        } catch (err) {
          console.warn('[PlayQueue] Error during filler fadeout:', err);
        }
        this.activeNodes.delete(node);
      }
      this.currentSource = null;
      this.activeItem = null;
      this.activeSentenceId = null;
      this.isPlaying = false;
      // Discard any other queued filler items
      this.queue = this.queue.filter((item) => item.kind !== 'filler' && item.sentenceId !== 0);
      this.playNext();
      return true;
    }
    return false;
  }

  /**
   * Stage 1 ducking: smoothly reduces assistant playback volume to ~25%
   * with a short ramp (default 40ms) when initial speech energy is detected.
   */
  public duck(targetVolume: number = 0.25, rampMs: number = 40): void {
    if (!this.audioContext || !this.gainNode) return;
    try {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(targetVolume, now + rampMs / 1000);
    } catch (err) {
      console.warn('[PlayQueue] Failed to duck volume:', err);
    }
  }

  /**
   * Restores assistant playback volume back to 100% when brief sound terminates before Stage 2.
   */
  public unduck(rampMs: number = 60): void {
    if (!this.audioContext || !this.gainNode) return;
    try {
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(1.0, now + rampMs / 1000);
    } catch (err) {
      console.warn('[PlayQueue] Failed to unduck volume:', err);
    }
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
    if (!this.isPlaying && !this.isDecoding && this.queue.length > 0) {
      await this.playNext();
    }
  }

  /**
   * Clears the queue, increments the epoch counter to drop all in-flight decodes,
   * ramps down gain over 25ms to prevent pops/clicks, and stops/disconnects all active nodes.
   */
  public clear(): void {
    // 1. Advance generation epoch so all pending decodes are discarded
    this.currentEpoch++;

    // 2. Empty queued items
    this.queue = [];

    // 3. Ramp gain down over 25ms to prevent audible click/pop
    if (this.gainNode && this.audioContext) {
      try {
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.025);

        // Schedule gain reset back to 1.0 after the stop
        setTimeout(() => {
          if (this.gainNode && this.audioContext) {
            this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
            this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
          }
        }, 35);
      } catch {
        // Gain ramp fallback
      }
    }

    // 4. Stop and disconnect EVERY active source node in the set
    const stopTime = (this.audioContext ? this.audioContext.currentTime : 0) + 0.025;
    for (const node of this.activeNodes) {
      try {
        node.stop(stopTime);
        setTimeout(() => {
          try {
            node.disconnect();
          } catch {
            // Node might already be disconnected
          }
        }, 35);
      } catch {
        // Ignore if already stopped
      }
    }
    this.activeNodes.clear();
    this.currentSource = null;

    // 5. Reset states
    this.isPlaying = false;
    this.isDecoding = false;
    this.isPaused = false;
    this.activeSentenceId = null;
    this.activeItem = null;
  }

  public getActiveNodesCount(): number {
    return this.activeNodes.size;
  }

  public getCurrentEpoch(): number {
    return this.currentEpoch;
  }

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
