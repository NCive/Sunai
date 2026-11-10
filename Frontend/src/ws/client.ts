import { SphereState, DecisionType } from '../sphere/SphereRenderer';

export interface MetricsComparisonStats {
  total_turns: number;
  total_interruptions: number;
  wrong_stops: number;
  wrong_non_stops: number;
  wrong_stop_rate_pct: number;
  wrong_non_stop_rate_pct: number;
  avg_response_delay_ms: number;
  avg_time_to_pause_ms: number;
}

export interface MetricsPayload {
  type: 'metrics';
  turn_id: number;
  mode: 'pause_first' | 'baseline';
  latencies_ms: {
    stt_final_text?: number;
    translation?: number;
    retrieval?: number;
    first_llm_token?: number;
    first_sentence_ready?: number;
    first_tts_audio?: number;
    playback_start?: number;
    response_delay?: number;
  };
  comparison: {
    pause_first: MetricsComparisonStats;
    baseline: MetricsComparisonStats;
  };
}

export interface ServerMessage {
  type: string;
  state?: SphereState;
  text?: string;
  language?: string;
  turn_id?: number;
  sentence_id?: number | string;
  kind?: 'sentence' | 'filler';
  is_last?: boolean;
  source?: string;
  audio?: string; // Base64 encoded audio
  decision?: DecisionType;
  mode?: string;
  phrase?: string;
  escalated?: boolean;
  sources?: string[];
  refused?: boolean;
  latencies_ms?: Record<string, number>;
  comparison?: {
    pause_first: MetricsComparisonStats;
    baseline: MetricsComparisonStats;
  };
}

export type StateChangeCallback = (state: SphereState) => void;
export type TextCallback = (text: string, language: string) => void;
export type TtsAudioCallback = (
  sentenceId: number | string,
  audio: ArrayBuffer,
  text?: string,
  turnId?: number,
  kind?: 'sentence' | 'filler',
  isLast?: boolean
) => void;
export type PromptAudioCallback = (phrase: string, text: string, audio: ArrayBuffer) => void;
export type DecisionCallback = (decision: DecisionType) => void;
export type ClearQueueCallback = (turnId?: number) => void;
export type SourcesCallback = (sources: string[], refused: boolean) => void;
export type MetricsCallback = (metrics: MetricsPayload) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type VoidCallback = () => void;

/**
 * Helper to decode base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * SunaiWebSocketClient
 * Manages WebSocket connection to Sunai Backend.
 * Sends binary mic audio and receives state transitions, live captions, and TTS audio.
 */
export class SunaiWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnected = false;

  public onStateChange: StateChangeCallback | null = null;
  public onPartialText: TextCallback | null = null;
  public onFinalText: TextCallback | null = null;
  public onTtsAudio: TtsAudioCallback | null = null;
  public onDecision: DecisionCallback | null = null;
  public onResume: VoidCallback | null = null;
  public onClearQueue: ClearQueueCallback | null = null;
  public onUnclearPrompt: PromptAudioCallback | null = null;
  public onIdlePrompt: PromptAudioCallback | null = null;
  public onSources: SourcesCallback | null = null;
  public onMetrics: MetricsCallback | null = null;
  public onConnectionChange: ConnectionCallback | null = null;

  constructor(url = 'ws://localhost:8000/ws') {
    this.url = url;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.onConnectionChange) this.onConnectionChange(true);
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const data: ServerMessage = jsonParseSafe(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('[WS Client] Failed to parse message:', e);
          }
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.onConnectionChange) this.onConnectionChange(false);
      };

      this.ws.onerror = (err) => {
        console.error('[WS Client] Error:', err);
      };
    } catch (e) {
      console.error('[WS Client] Failed to connect:', e);
    }
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'state':
        if (msg.state && this.onStateChange) {
          this.onStateChange(msg.state);
        }
        break;

      case 'partial_text':
        if (msg.text && this.onPartialText) {
          this.onPartialText(msg.text, msg.language || 'hi-IN');
        }
        break;

      case 'final_text':
        if (msg.text && this.onFinalText) {
          this.onFinalText(msg.text, msg.language || 'hi-IN');
        }
        break;

      case 'tts_audio':
        if (msg.audio && msg.sentence_id !== undefined && this.onTtsAudio) {
          const audioBuffer = base64ToArrayBuffer(msg.audio);
          this.onTtsAudio(msg.sentence_id, audioBuffer, msg.text, msg.turn_id, msg.kind, msg.is_last);
        }
        break;

      case 'decision':
        if (msg.decision && this.onDecision) {
          this.onDecision(msg.decision);
        }
        break;

      case 'resume':
        if (this.onResume) {
          this.onResume();
        }
        break;

      case 'clear_queue':
        if (this.onClearQueue) {
          this.onClearQueue(msg.turn_id);
        }
        break;

      case 'unclear_prompt':
        if (msg.audio && msg.phrase && this.onUnclearPrompt) {
          const audioBuffer = base64ToArrayBuffer(msg.audio);
          this.onUnclearPrompt(msg.phrase, msg.text || '', audioBuffer);
        }
        break;

      case 'idle_prompt':
        if (msg.audio && msg.phrase && this.onIdlePrompt) {
          const audioBuffer = base64ToArrayBuffer(msg.audio);
          this.onIdlePrompt(msg.phrase, msg.text || '', audioBuffer);
        }
        break;

      case 'sources':
        if (this.onSources) {
          this.onSources(msg.sources || [], !!msg.refused);
        }
        break;

      case 'metrics':
        if (this.onMetrics) {
          this.onMetrics(msg as unknown as MetricsPayload);
        }
        break;

      default:
        break;
    }
  }

  public sendAudioChunk(chunk: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  public sendVadStart(meta?: { durationMs?: number; peak?: number; rms?: number; speechProbability?: number }): void {
    this.sendJson({
      type: 'vad_start',
      duration_ms: meta?.durationMs,
      peak: meta?.peak,
      rms: meta?.rms,
      speech_probability: meta?.speechProbability,
    });
  }

  public sendBlipIgnored(): void {
    this.sendJson({ type: 'blip_ignored' });
  }

  public sendLanguageOverride(language: string): void {
    this.sendJson({ type: 'set_language', language });
  }

  public sendVadEnd(): void {
    this.sendJson({ type: 'vad_end' });
  }

  public sendSentencePlayed(sentenceId: number | string, turnId?: number, kind?: string): void {
    this.sendJson({ type: 'sentence_played', id: sentenceId, turn_id: turnId, kind });
  }

  public sendPlaybackFinished(): void {
    this.sendJson({ type: 'playback_finished' });
  }

  public sendWake(): void {
    this.sendJson({ type: 'wake' });
  }

  public setMode(mode: 'pause_first' | 'baseline'): void {
    this.sendJson({ type: 'set_mode', mode });
  }

  public setStubDecision(decision: 'small_sound' | 'interruption'): void {
    this.sendJson({ type: 'set_stub_decision', decision });
  }

  public sendClearAck(turnId?: number): void {
    this.sendJson({ type: 'clear_ack', turn_id: turnId });
  }

  public sendJson(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

function jsonParseSafe(str: string): any {
  return JSON.parse(str);
}

