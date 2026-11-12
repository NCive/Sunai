import React, { useState } from 'react';
import { MetricsPayload } from '../ws/client';
import { GlobeIcon, HeadphonesIcon, SparklesIcon, LockIcon, FileTextIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

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
  'hi-IN': 'Hindi (हिन्दी)',
  'mr-IN': 'Marathi (मराठी)',
  'hi-Latn': 'Hinglish (Roman)',
  'en-IN': 'Indian English',
  'en': 'English',
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

  const langLabel = LANGUAGE_LABELS[detectedLanguage] || detectedLanguage;
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
        fontSize: '0.74rem',
        color: 'var(--space-star)',
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
          background: 'var(--space-navy-90)',
          border: '1px solid var(--space-blue-70)',
          borderRadius: '6px',
          padding: '6px 12px',
        }}
      >
        {/* Language Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GlobeIcon size={13} color="var(--space-gold)" />
          <span style={{ color: 'var(--space-star-70)', fontWeight: 600 }}>Lang:</span>
          <span
            style={{
              background: 'var(--space-blue-20)',
              color: 'var(--space-star)',
              border: '1px solid var(--space-blue-70)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            {langLabel}
          </span>
        </div>

        {/* Mic Level Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--space-star-70)', fontWeight: 600 }}>Mic:</span>
          <div
            style={{
              width: '70px',
              height: '6px',
              background: 'var(--space-black)',
              borderRadius: '3px',
              overflow: 'hidden',
              border: '1px solid var(--space-blue-40)',
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

        {/* Headphone Advisory Tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--space-star-70)', fontSize: '0.68rem' }}>
          <HeadphonesIcon size={14} color="var(--space-gold)" />
          <span>Headphones recommended for acoustic isolation</span>
        </div>
      </div>

      {/* Latency Strip (Stage Breakdown for Last Turn) */}
      {latencies && Object.keys(latencies).length > 0 && (
        <div
          style={{
            background: 'var(--space-navy-90)',
            border: '1px solid var(--space-blue-70)',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--space-gold)', fontWeight: 700, fontFamily: 'var(--font-hud)', letterSpacing: '0.04em' }}>
            <SparklesIcon size={13} color="var(--space-gold)" />
            <span>STAGE LATENCIES:</span>
          </div>

          {latencies.stt_final_text !== undefined && (
            <span style={{ background: 'var(--space-blue-20)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--space-blue-40)' }}>
              STT: <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.stt_final_text} ms</strong>
            </span>
          )}

          {latencies.translation !== undefined && latencies.translation > 0 && (
            <span style={{ background: 'var(--space-blue-20)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--space-blue-40)' }}>
              Trans: <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.translation} ms</strong>
            </span>
          )}

          {latencies.retrieval !== undefined && (
            <span style={{ background: 'var(--space-blue-20)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--space-blue-40)' }}>
              RAG: <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.retrieval} ms</strong>
            </span>
          )}

          {latencies.first_llm_token !== undefined && (
            <span style={{ background: 'var(--space-blue-20)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--space-blue-40)' }}>
              LLM TTFT: <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.first_llm_token} ms</strong>
            </span>
          )}

          {latencies.first_tts_audio !== undefined && (
            <span style={{ background: 'var(--space-blue-20)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--space-blue-40)' }}>
              TTS: <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>{latencies.first_tts_audio} ms</strong>
            </span>
          )}

          {latencies.response_delay !== undefined && (
            <span
              className="tabular-nums"
              style={{
                background: 'var(--decision-green-bg)',
                color: 'var(--decision-green)',
                border: '1px solid var(--decision-green-border)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 700,
                marginLeft: 'auto',
              }}
            >
              Total Audio Delay: {latencies.response_delay} ms
            </span>
          )}
        </div>
      )}

      {/* Sources Panel / Refusal Gate Card */}
      {(sources.length > 0 || isRefused) && (
        <div
          style={{
            background: isRefused ? 'var(--decision-red-bg)' : 'var(--space-navy-90)',
            border: `1px solid ${isRefused ? 'var(--decision-red-border)' : 'var(--space-blue-70)'}`,
            borderRadius: '6px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: transitionStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isRefused ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--decision-red)', fontWeight: 700 }}>
                <LockIcon size={14} color="var(--decision-red)" />
                <span>Refusal Gate Triggered (Question not grounded in documents)</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileTextIcon size={14} color="var(--space-gold)" />
                <span style={{ color: 'var(--space-star)', fontWeight: 700 }}>Grounded Knowledge Sources:</span>
                <span style={{ color: 'var(--space-star-70)' }}>{sources.join(', ')}</span>
              </div>
            )}
            {!isRefused && sources.length > 0 && (
              <button
                onClick={() => setShowSourcesExpanded(!showSourcesExpanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--space-star)',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                {showSourcesExpanded ? (
                  <>
                    <ChevronUpIcon size={12} />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <ChevronDownIcon size={12} />
                    <span>Details</span>
                  </>
                )}
              </button>
            )}
          </div>

          {showSourcesExpanded && !isRefused && (
            <div style={{ fontSize: '0.70rem', color: 'var(--space-star-70)', borderTop: '1px solid var(--space-blue-40)', paddingTop: '4px', marginTop: '2px' }}>
              Answers strictly constrained to retrieved English document chunks via hybrid BM25 + all-MiniLM-L6-v2 vector index.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
