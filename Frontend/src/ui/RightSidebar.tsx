import React, { useState } from 'react';
import { SidebarCard } from './SidebarCard';
import { ModeSwitchAndStats } from './ModeSwitchAndStats';
import { MetricsPayload } from '../ws/client';
import { SphereState, DecisionType } from '../sphere/SphereRenderer';
import {
  SparklesIcon,
  MicIcon,
  MicOffIcon,
  ActivityIcon,
  HeadphonesIcon,
  SlidersIcon,
  LockIcon,
  FileTextIcon,
  Volume2Icon,
} from './Icons';

export interface RightSidebarProps {
  // Mode & stats
  interruptionMode: 'pause_first' | 'baseline';
  onModeChange: (mode: 'pause_first' | 'baseline') => void;
  metrics: MetricsPayload | null;

  // Mic & VAD
  isMicOn: boolean;
  onToggleMic: () => void;
  micEnergy: number;
  isSpeakingVad: boolean;
  micChunksCount: number;

  // Intelligence & status
  sources: string[];
  isRefused: boolean;

  // Dev controls
  stubDecision: 'small_sound' | 'interruption';
  onStubDecisionChange: (val: 'small_sound' | 'interruption') => void;
  isPlayingAudio: boolean;
  activeSentenceId: number | string | null;
  queueLength: number;
  onEnqueueSentence: (id: number, dur: number, freq: number) => void;
  onPauseAudio: () => void;
  onResumeAudio: () => void;
  onClearAudio: () => void;
  currentState: SphereState;
  onStateChange: (state: SphereState) => void;
  onDecision: (dec: DecisionType) => void;
  lowPower: boolean;
  onToggleLowPower: () => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  onReconnectWs: () => void;

  className?: string;
  style?: React.CSSProperties;
}

const ALL_STATES: SphereState[] = [
  'IDLE',
  'LISTENING',
  'THINKING',
  'SPEAKING',
  'PAUSED',
  'IDLE_CHECK',
  'SLEEP',
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  interruptionMode,
  onModeChange,
  metrics,
  isMicOn,
  onToggleMic,
  micEnergy,
  isSpeakingVad,
  micChunksCount,
  sources,
  isRefused,
  stubDecision,
  onStubDecisionChange,
  isPlayingAudio,
  activeSentenceId,
  queueLength,
  onEnqueueSentence,
  onPauseAudio,
  onResumeAudio,
  onClearAudio,
  currentState,
  onStateChange,
  onDecision,
  lowPower,
  onToggleLowPower,
  reduceMotion,
  onToggleReduceMotion,
  onReconnectWs,
  className = '',
  style,
}) => {
  const [showSourcesExpanded, setShowSourcesExpanded] = useState<boolean>(false);
  const latencies = metrics?.latencies_ms;

  return (
    <aside
      className={`sidebar-scroll ${className}`}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--space-navy-95)',
        borderLeft: '1px solid var(--space-blue-70)',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 12px 32px 12px',
        zIndex: 20,
        ...style,
      }}
    >
      {/* CARD A: Interruption Mode & Comparison Stats */}
      <SidebarCard
        title="Interruption Mode"
        icon={<SparklesIcon size={15} />}
        defaultCollapsed={false}
        reduceMotion={reduceMotion}
        headerRight={
          <span
            style={{
              fontSize: '0.64rem',
              fontWeight: 700,
              fontFamily: 'var(--font-hud)',
              letterSpacing: '0.04em',
              padding: '2px 6px',
              borderRadius: '3px',
              background: interruptionMode === 'pause_first' ? 'var(--space-blue-20)' : 'var(--decision-amber-bg)',
              color: interruptionMode === 'pause_first' ? 'var(--space-gold)' : 'var(--decision-amber)',
              border: `1px solid ${interruptionMode === 'pause_first' ? 'var(--space-gold)' : 'var(--decision-amber-border)'}`,
            }}
          >
            {interruptionMode === 'pause_first' ? 'PAUSE-FIRST' : 'BASELINE'}
          </span>
        }
      >
        <ModeSwitchAndStats
          currentMode={interruptionMode}
          onModeChange={onModeChange}
          metrics={metrics}
          reduceMotion={reduceMotion}
        />
      </SidebarCard>

      {/* CARD B: Microphone & VAD */}
      <SidebarCard
        title="Microphone & VAD"
        icon={isMicOn ? <MicIcon size={15} /> : <MicOffIcon size={15} />}
        defaultCollapsed={false}
        reduceMotion={reduceMotion}
        headerRight={
          <span
            style={{
              fontSize: '0.64rem',
              fontWeight: 700,
              fontFamily: 'var(--font-hud)',
              letterSpacing: '0.04em',
              padding: '2px 6px',
              borderRadius: '3px',
              background: isMicOn ? 'var(--decision-green-bg)' : 'var(--space-blue-20)',
              color: isMicOn ? 'var(--decision-green)' : 'var(--space-star-70)',
              border: `1px solid ${isMicOn ? 'var(--decision-green-border)' : 'var(--space-blue-40)'}`,
            }}
          >
            {isMicOn ? 'LIVE 16KHZ' : 'OFFLINE'}
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Main CTA Start / Stop Mic Button */}
          <button
            type="button"
            onClick={onToggleMic}
            className={`btn-cta-mic ${isMicOn ? 'mic-active' : ''}`}
            style={{ width: '100%' }}
          >
            {isMicOn ? (
              <>
                <MicOffIcon size={16} />
                <span>Stop Microphone</span>
              </>
            ) : (
              <>
                <MicIcon size={16} />
                <span>Start Mic (16 kHz PCM)</span>
              </>
            )}
          </button>

          {/* Live Mic Level Energy & VAD State */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--space-star-70)' }}>
              <span>Live Mic Energy</span>
              <span style={{ color: isSpeakingVad ? 'var(--decision-green)' : 'var(--space-star-50)', fontWeight: 600 }}>
                {isSpeakingVad ? 'Voice Detected (VAD)' : 'Silence'}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--space-black)',
                borderRadius: '3px',
                border: '1px solid var(--space-blue-40)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(micEnergy * 400))}%`,
                  height: '100%',
                  background: isSpeakingVad ? 'var(--decision-green)' : 'var(--space-gold)',
                  transition: reduceMotion ? 'none' : 'width 0.05s linear',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--space-star-70)' }}>
            <span>Chunks Streamed (100ms):</span>
            <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>
              {micChunksCount}
            </strong>
          </div>
        </div>
      </SidebarCard>

      {/* CARD C: Status & Intelligence */}
      <SidebarCard
        title="Intelligence & Latency"
        icon={<ActivityIcon size={15} />}
        defaultCollapsed={false}
        reduceMotion={reduceMotion}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem' }}>
          {/* Latency Breakdown Rows */}
          {latencies && Object.keys(latencies).length > 0 && (
            <div
              style={{
                background: 'var(--space-navy-90)',
                border: '1px solid var(--space-blue-70)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-hud)', fontSize: '0.68rem', letterSpacing: '0.06em', color: 'var(--space-gold)' }}>
                  STAGE TIMINGS
                </span>
                {latencies.response_delay !== undefined && (
                  <span className="tabular-nums" style={{ color: 'var(--decision-green)', fontWeight: 700, fontSize: '0.70rem' }}>
                    Total: {latencies.response_delay} ms
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.68rem' }}>
                {latencies.stt_final_text !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--space-star-70)' }}>
                    <span>STT Text:</span>
                    <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.stt_final_text} ms</strong>
                  </div>
                )}
                {latencies.translation !== undefined && latencies.translation > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--space-star-70)' }}>
                    <span>Translate:</span>
                    <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.translation} ms</strong>
                  </div>
                )}
                {latencies.retrieval !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--space-star-70)' }}>
                    <span>RAG Match:</span>
                    <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.retrieval} ms</strong>
                  </div>
                )}
                {latencies.first_llm_token !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--space-star-70)' }}>
                    <span>LLM TTFT:</span>
                    <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.first_llm_token} ms</strong>
                  </div>
                )}
                {latencies.first_tts_audio !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--space-star-70)' }}>
                    <span>TTS Audio:</span>
                    <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.first_tts_audio} ms</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sources / Refusal Gate */}
          {(sources.length > 0 || isRefused) && (
            <div
              style={{
                background: isRefused ? 'var(--decision-red-bg)' : 'var(--space-blue-20)',
                border: `1px solid ${isRefused ? 'var(--decision-red-border)' : 'var(--space-blue-70)'}`,
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {isRefused ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--decision-red)', fontWeight: 700 }}>
                    <LockIcon size={14} color="var(--decision-red)" />
                    <span>Refusal Gate Active</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileTextIcon size={14} color="var(--space-gold)" />
                    <span style={{ color: 'var(--space-star)', fontWeight: 600 }}>Sources ({sources.length}):</span>
                    <span style={{ color: 'var(--space-star-70)', fontSize: '0.66rem' }}>{sources.join(', ')}</span>
                  </div>
                )}
                {!isRefused && sources.length > 0 && (
                  <button
                    onClick={() => setShowSourcesExpanded(!showSourcesExpanded)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--space-star)',
                      fontSize: '0.66rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showSourcesExpanded ? 'Less' : 'More'}
                  </button>
                )}
              </div>
              {showSourcesExpanded && !isRefused && (
                <div style={{ fontSize: '0.66rem', color: 'var(--space-star-70)', borderTop: '1px solid var(--space-blue-40)', paddingTop: '4px' }}>
                  Grounded strictly in retrieved document chunks via BM25 + all-MiniLM-L6-v2 embeddings.
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarCard>

      {/* CARD D: Acoustic Isolation Advice */}
      <div
        style={{
          background: 'var(--space-navy-90)',
          border: '1px dashed var(--space-blue-70)',
          borderRadius: '6px',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.70rem',
          color: 'var(--space-star-70)',
        }}
      >
        <div style={{ color: 'var(--space-gold)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <HeadphonesIcon size={18} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: 'var(--space-star)' }}>Acoustic Recommendation</strong>
          <span>Headphones recommended for acoustic isolation and echo-free interruption testing.</span>
        </div>
      </div>

      {/* CARD E: Developer Tools (COLLAPSED BY DEFAULT) */}
      <SidebarCard
        title="Developer Tools"
        icon={<SlidersIcon size={15} />}
        defaultCollapsed={true}
        reduceMotion={reduceMotion}
        headerRight={
          <span style={{ fontSize: '0.62rem', color: 'var(--space-star-50)' }}>
            Testing stubs & forcers
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.72rem' }}>
          {/* Interruption Stubs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--space-star-70)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.66rem' }}>
              Interruption Stubs
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button
                className={stubDecision === 'small_sound' ? 'active' : ''}
                onClick={() => onStubDecisionChange('small_sound')}
                title="Stub returns small_sound -> ring flashes green and bot resumes"
                style={{ fontSize: '0.68rem', padding: '5px 4px' }}
              >
                Small Sound (Resume)
              </button>
              <button
                className={stubDecision === 'interruption' ? 'active' : ''}
                onClick={() => onStubDecisionChange('interruption')}
                title="Stub returns interruption -> ring flashes red and bot stops"
                style={{ fontSize: '0.68rem', padding: '5px 4px' }}
              >
                Interrupt (Stop)
              </button>
            </div>
          </div>

          {/* Play Queue Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--space-star-70)', fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Volume2Icon size={12} />
                <span>Play Queue</span>
              </div>
              <span className="tabular-nums" style={{ color: isPlayingAudio ? 'var(--decision-green)' : 'var(--space-star-50)' }}>
                {isPlayingAudio
                  ? `Playing S${activeSentenceId} (Q:${queueLength})`
                  : queueLength > 0
                  ? `Paused (Q:${queueLength})`
                  : 'Empty'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button onClick={() => onEnqueueSentence(1, 3.5, 220)} style={{ fontSize: '0.68rem', padding: '5px 4px' }}>
                + Enqueue S1 (3.5s)
              </button>
              <button onClick={() => onEnqueueSentence(2, 4.0, 300)} style={{ fontSize: '0.68rem', padding: '5px 4px' }}>
                + Enqueue S2 (4.0s)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              <button onClick={onPauseAudio} style={{ fontSize: '0.68rem', padding: '4px' }}>Pause</button>
              <button onClick={onResumeAudio} style={{ fontSize: '0.68rem', padding: '4px' }}>Resume</button>
              <button onClick={onClearAudio} style={{ fontSize: '0.68rem', padding: '4px' }}>Clear</button>
            </div>
          </div>

          {/* State Forcer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--space-star-70)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.66rem' }}>
              State Forcer
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {ALL_STATES.map((st) => (
                <button
                  key={st}
                  className={currentState === st ? 'active' : ''}
                  onClick={() => onStateChange(st)}
                  style={{ fontSize: '0.64rem', padding: '4px 2px' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Decision Triggers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--space-star-70)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.66rem' }}>
              Decision Triggers
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button
                className="decision-noise"
                onClick={() => onDecision('noise')}
                title="Green ring, speeds up"
                style={{ fontSize: '0.66rem', padding: '4px' }}
              >
                Noise (Green)
              </button>
              <button
                className="decision-small"
                onClick={() => onDecision('small_sound')}
                title="Green ring, resumes"
                style={{ fontSize: '0.66rem', padding: '4px' }}
              >
                Small Sound (Green)
              </button>
              <button
                className="decision-go-on"
                onClick={() => onDecision('go_on')}
                title="Green ring, resumes"
                style={{ fontSize: '0.66rem', padding: '4px' }}
              >
                Go-on (Green)
              </button>
              <button
                className="decision-interrupt"
                onClick={() => onDecision('interruption')}
                title="Red ring, quick burst, stops"
                style={{ fontSize: '0.66rem', padding: '4px' }}
              >
                Interruption (Red)
              </button>
            </div>
            <button
              className="decision-unclear"
              onClick={() => onDecision('unclear')}
              title="Amber ring, wobble and ask"
              style={{ fontSize: '0.66rem', padding: '4px', width: '100%', marginTop: '2px' }}
            >
              Unclear 'Ji?' (Amber)
            </button>
          </div>

          {/* Performance & WebSocket Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--space-blue-40)', paddingTop: '6px' }}>
            <button
              className={lowPower ? 'active' : ''}
              onClick={onToggleLowPower}
              style={{ fontSize: '0.68rem', padding: '5px' }}
            >
              {lowPower ? 'Low Power Mode: ON (2k dots)' : 'Low Power Mode: OFF'}
            </button>
            <button
              className={reduceMotion ? 'active' : ''}
              onClick={onToggleReduceMotion}
              style={{ fontSize: '0.68rem', padding: '5px' }}
            >
              {reduceMotion ? 'Reduce Motion: ON' : 'Reduce Motion: OFF'}
            </button>
            <button onClick={onReconnectWs} style={{ fontSize: '0.68rem', padding: '5px' }}>
              Reconnect WebSocket
            </button>
          </div>
        </div>
      </SidebarCard>
    </aside>
  );
};
