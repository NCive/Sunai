import React, { useState } from 'react';
import { MetricsPayload } from '../ws/client';

export interface StatusBarProps {
  metrics: MetricsPayload | null;
  sources: string[];
  isRefused: boolean;
  detectedLanguage: string;
  micEnergy: number;
  isSpeakingVad: boolean;
  reduceMotion?: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  'hi-IN': '🇮🇳 Hindi (हिन्दी)',
  'mr-IN': '🇮🇳 Marathi (मराठी)',
  'hi-Latn': '🇮🇳 Hinglish (Roman)',
  'en-IN': '🇮🇳 Indian English',
  'en': '🇬🇧 English',
};

export const StatusBar: React.FC<StatusBarProps> = ({
  metrics,
  sources,
  isRefused,
  detectedLanguage,
  micEnergy,
  isSpeakingVad,
  reduceMotion = false,
}) => {
  const [showSourcesExpanded, setShowSourcesExpanded] = useState<boolean>(false);

  const langLabel = LANGUAGE_LABELS[detectedLanguage] || `🌐 ${detectedLanguage}`;
  const latencies = metrics?.latencies_ms;

  const transitionStyle = reduceMotion ? 'none' : 'all 0.25s ease';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        maxWidth: '720px',
        fontSize: '0.76rem',
        color: '#cbd5e1',
        zIndex: 10,
      }}
    >
      {/* Top Strip: Language Chip, Mic Meter, Headphone Tip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '6px 12px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Language Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Lang:</span>
          <span
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            {langLabel}
          </span>
        </div>

        {/* Mic Level Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Mic:</span>
          <div
            style={{
              width: '70px',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
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
              }}
            />
          </div>
        </div>

        {/* Headphone Advisory Tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '0.7rem' }}>
          <span>🎧</span>
          <span>Headphones recommended for acoustic isolation</span>
        </div>
      </div>

      {/* Latency Strip (Stage Breakdown for Last Turn) */}
      {latencies && Object.keys(latencies).length > 0 && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '6px 12px',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>⚡ STAGE LATENCIES:</span>

          {latencies.stt_final_text !== undefined && (
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              STT: <strong style={{ color: '#fff' }}>{latencies.stt_final_text}ms</strong>
            </span>
          )}

          {latencies.translation !== undefined && latencies.translation > 0 && (
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              Trans: <strong style={{ color: '#fff' }}>{latencies.translation}ms</strong>
            </span>
          )}

          {latencies.retrieval !== undefined && (
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              RAG: <strong style={{ color: '#fff' }}>{latencies.retrieval}ms</strong>
            </span>
          )}

          {latencies.first_llm_token !== undefined && (
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              LLM 1st Tok: <strong style={{ color: '#fff' }}>{latencies.first_llm_token}ms</strong>
            </span>
          )}

          {latencies.first_tts_audio !== undefined && (
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
              TTS 1st: <strong style={{ color: '#fff' }}>{latencies.first_tts_audio}ms</strong>
            </span>
          )}

          {latencies.response_delay !== undefined && (
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                marginLeft: 'auto',
              }}
            >
              Total Audio Delay: {latencies.response_delay}ms
            </span>
          )}
        </div>
      )}

      {/* Sources Panel / Refusal Gate Card */}
      {(sources.length > 0 || isRefused) && (
        <div
          style={{
            background: isRefused ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isRefused ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
            borderRadius: '10px',
            padding: '8px 12px',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: transitionStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isRefused ? (
              <span style={{ color: '#f87171', fontWeight: 700 }}>
                🔒 Refusal Gate Triggered (Question not grounded in documents)
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#34d399', fontWeight: 700 }}>📚 Grounded Knowledge Sources:</span>
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
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                {showSourcesExpanded ? '▲ Hide' : '▼ Details'}
              </button>
            )}
          </div>

          {showSourcesExpanded && !isRefused && (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '4px', marginTop: '2px' }}>
              Answers strictly constrained to retrieved English document chunks via hybrid BM25 + all-MiniLM-L6-v2 vector index.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

