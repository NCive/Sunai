import React, { useState } from 'react';
import { SidebarCard } from './SidebarCard';
import { ModeSwitchAndStats } from './ModeSwitchAndStats';
import { MetricsPayload } from '../ws/client';
import { SphereState, DecisionType } from '../sphere/SphereRenderer';

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
  detectedLanguage: string;
  onLanguageChange?: (language: string) => void;
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
  detectedLanguage,
  onLanguageChange,
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
        background: 'rgba(10, 15, 30, 0.95)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '14px',
        backdropFilter: 'blur(16px)',
        zIndex: 20,
        ...style,
      }}
    >
      {/* CARD A: Interruption Mode & Comparison Stats */}
      <SidebarCard
        title="Interruption Mode & Stats"
        icon="⚡"
        defaultCollapsed={false}
        reduceMotion={reduceMotion}
        headerRight={
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: interruptionMode === 'pause_first' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: interruptionMode === 'pause_first' ? '#34d399' : '#fbbf24',
              border: `1px solid ${interruptionMode === 'pause_first' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            }}
          >
            {interruptionMode === 'pause_first' ? 'Pause-First' : 'Baseline'}
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

      {/* CARD B: Mic & VAD */}
      <SidebarCard
        title="Microphone & VAD"
        icon="🎙️"
        defaultCollapsed={false}
        reduceMotion={reduceMotion}
        headerRight={
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: isMicOn ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.1)',
              color: isMicOn ? '#4ade80' : '#94a3b8',
              border: `1px solid ${isMicOn ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
            }}
          >
            {isMicOn ? 'Live 16kHz' : 'Off'}
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onToggleMic}
              className={isMicOn ? 'active' : 'primary'}
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600 }}
            >
              {isMicOn ? 'Stop Mic' : 'Start Mic (16kHz)'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
              <span>Live Mic Energy</span>
              <span style={{ color: isSpeakingVad ? '#4ade80' : '#94a3b8', fontWeight: 600 }}>
                {isSpeakingVad ? '● Voice Detected (VAD)' : 'Silence'}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round(micEnergy * 400))}%`,
                  height: '100%',
                  background: isSpeakingVad ? '#22c55e' : '#38bdf8',
                  transition: reduceMotion ? 'none' : 'width 0.05s linear',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>Chunks Streamed:</span>
            <strong style={{ color: '#e2e8f0' }}>{micChunksCount}</strong>
          </div>
        </div>
      </SidebarCard>

      {/* CARD C: Status / Intelligence */}
      <SidebarCard
        title="Status & Intelligence"
        icon="📊"
        defaultCollapsed={false}
        reduceMotion={reduceMotion}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.74rem' }}>
          {/* Language Chip with Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Active Language:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={detectedLanguage}
                onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontWeight: 600,
                  fontSize: '0.70rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="indic-auto" style={{ background: '#0f172a', color: '#e2e8f0' }}>Auto</option>
                <option value="en-IN" style={{ background: '#0f172a', color: '#e2e8f0' }}>English</option>
                <option value="hi-IN" style={{ background: '#0f172a', color: '#e2e8f0' }}>Hindi</option>
                <option value="mr-IN" style={{ background: '#0f172a', color: '#e2e8f0' }}>Marathi</option>
              </select>
            </div>
          </div>

          {/* Latency Strip Breakdown */}
          {latencies && Object.keys(latencies).length > 0 && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>STAGE LATENCIES</span>
                {latencies.response_delay !== undefined && (
                  <span style={{ color: '#34d399', fontWeight: 700 }}>
                    Delay: {latencies.response_delay}ms
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.7rem' }}>
                {latencies.stt_final_text !== undefined && (
                  <span style={{ color: '#94a3b8' }}>
                    STT: <strong style={{ color: '#fff' }}>{latencies.stt_final_text}ms</strong>
                  </span>
                )}
                {latencies.translation !== undefined && latencies.translation > 0 && (
                  <span style={{ color: '#94a3b8' }}>
                    Trans: <strong style={{ color: '#fff' }}>{latencies.translation}ms</strong>
                  </span>
                )}
                {latencies.retrieval !== undefined && (
                  <span style={{ color: '#94a3b8' }}>
                    RAG: <strong style={{ color: '#fff' }}>{latencies.retrieval}ms</strong>
                  </span>
                )}
                {latencies.first_llm_token !== undefined && (
                  <span style={{ color: '#94a3b8' }}>
                    LLM 1st: <strong style={{ color: '#fff' }}>{latencies.first_llm_token}ms</strong>
                  </span>
                )}
                {latencies.first_tts_audio !== undefined && (
                  <span style={{ color: '#94a3b8' }}>
                    TTS 1st: <strong style={{ color: '#fff' }}>{latencies.first_tts_audio}ms</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sources Panel / Refusal Gate Card */}
          {(sources.length > 0 || isRefused) && (
            <div
              style={{
                background: isRefused ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${isRefused ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {isRefused ? (
                  <span style={{ color: '#f87171', fontWeight: 700 }}>
                    🔒 Refusal Gate Triggered
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#34d399', fontWeight: 700 }}>📚 Sources:</span>
                    <span style={{ color: '#a7f3d0' }}>{sources.join(', ')}</span>
                  </div>
                )}
                {!isRefused && sources.length > 0 && (
                  <button
                    onClick={() => setShowSourcesExpanded(!showSourcesExpanded)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6ee7b7',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showSourcesExpanded ? '▲ Less' : '▼ More'}
                  </button>
                )}
              </div>
              {showSourcesExpanded && !isRefused && (
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4px', marginTop: '2px' }}>
                  Grounded strictly in retrieved document chunks via BM25 + all-MiniLM-L6-v2.
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarCard>

      {/* CARD D: Acoustic Isolation Advice */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px dashed rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.72rem',
          color: '#94a3b8',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>🎧</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: '#cbd5e1' }}>Acoustic Recommendation</strong>
          <span>Headphones recommended for acoustic isolation and echo-free interruption testing.</span>
        </div>
      </div>

      {/* CARD E: Dev Tools (COLLAPSED BY DEFAULT) */}
      <SidebarCard
        title="Developer Tools"
        icon="🛠️"
        defaultCollapsed={true}
        reduceMotion={reduceMotion}
        headerRight={
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Testing stubs & forcers
          </span>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.74rem' }}>
          {/* Stubs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem' }}>
              Interruption Stubs
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                className={stubDecision === 'small_sound' ? 'active' : ''}
                onClick={() => onStubDecisionChange('small_sound')}
                title="Stub returns small_sound -> ring flashes green and bot resumes"
                style={{ fontSize: '0.7rem', padding: '6px 4px' }}
              >
                Small Sound (Resume)
              </button>
              <button
                className={stubDecision === 'interruption' ? 'active' : ''}
                onClick={() => onStubDecisionChange('interruption')}
                title="Stub returns interruption -> ring flashes red and bot stops"
                style={{ fontSize: '0.7rem', padding: '6px 4px' }}
              >
                Interrupt (Stop)
              </button>
            </div>
          </div>

          {/* Play Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase' }}>
              <span>Play Queue</span>
              <span style={{ color: isPlayingAudio ? '#4ade80' : '#94a3b8' }}>
                {isPlayingAudio
                  ? `Playing S${activeSentenceId} (Q:${queueLength})`
                  : queueLength > 0
                  ? `Paused (Q:${queueLength})`
                  : 'Empty'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button onClick={() => onEnqueueSentence(1, 3.5, 220)} style={{ fontSize: '0.7rem', padding: '6px 4px' }}>
                + Enqueue S1 (3.5s)
              </button>
              <button onClick={() => onEnqueueSentence(2, 4.0, 300)} style={{ fontSize: '0.7rem', padding: '6px 4px' }}>
                + Enqueue S2 (4.0s)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              <button onClick={onPauseAudio} style={{ fontSize: '0.7rem', padding: '4px' }}>Pause</button>
              <button onClick={onResumeAudio} style={{ fontSize: '0.7rem', padding: '4px' }}>Resume</button>
              <button onClick={onClearAudio} style={{ fontSize: '0.7rem', padding: '4px' }}>Clear</button>
            </div>
          </div>

          {/* State Forcer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem' }}>
              State Forcer
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {ALL_STATES.map((st) => (
                <button
                  key={st}
                  className={currentState === st ? 'active' : ''}
                  onClick={() => onStateChange(st)}
                  style={{ fontSize: '0.66rem', padding: '4px 2px' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Decision Triggers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem' }}>
              Decision Triggers
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button
                className="decision-noise"
                onClick={() => onDecision('noise')}
                title="Green ring, speeds up"
                style={{ fontSize: '0.68rem', padding: '4px' }}
              >
                Noise (Green)
              </button>
              <button
                className="decision-small"
                onClick={() => onDecision('small_sound')}
                title="Green ring, resumes"
                style={{ fontSize: '0.68rem', padding: '4px' }}
              >
                Small Sound (Green)
              </button>
              <button
                className="decision-small"
                onClick={() => onDecision('go_on')}
                title="Green ring, resumes"
                style={{ fontSize: '0.68rem', padding: '4px' }}
              >
                Go-on (Green)
              </button>
              <button
                className="decision-interrupt"
                onClick={() => onDecision('interruption')}
                title="Red ring, quick burst, stops"
                style={{ fontSize: '0.68rem', padding: '4px' }}
              >
                Interruption (Red)
              </button>
            </div>
            <button
              className="decision-unclear"
              onClick={() => onDecision('unclear')}
              title="Amber ring, wobble + flicker"
              style={{ fontSize: '0.68rem', padding: '4px', width: '100%', marginTop: '2px' }}
            >
              Unclear 'Ji?' (Amber)
            </button>
          </div>

          {/* Settings & WS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
            <button
              className={lowPower ? 'active' : ''}
              onClick={onToggleLowPower}
              title="Drops dot count to 2000, disables bloom, disables background particles"
              style={{ fontSize: '0.72rem', padding: '6px' }}
            >
              {lowPower ? '✓ Low Power (2k dots, bloom off)' : 'Low Power Mode'}
            </button>
            <button
              className={reduceMotion ? 'active' : ''}
              onClick={onToggleReduceMotion}
              title="Disables sphere rotation and spring animations across all panels"
              style={{ fontSize: '0.72rem', padding: '6px' }}
            >
              {reduceMotion ? '✓ Reduce Motion Active' : 'Reduce Motion'}
            </button>
            <button onClick={onReconnectWs} style={{ fontSize: '0.72rem', padding: '6px' }}>
              Reconnect WebSocket
            </button>
          </div>
        </div>
      </SidebarCard>
    </aside>
  );
};
