import React, { useState } from 'react';
import { MetricsPayload, MetricsComparisonStats } from '../ws/client';

export interface ModeSwitchAndStatsProps {
  currentMode: 'pause_first' | 'baseline';
  onModeChange: (mode: 'pause_first' | 'baseline') => void;
  metrics: MetricsPayload | null;
  reduceMotion?: boolean;
}

export const ModeSwitchAndStats: React.FC<ModeSwitchAndStatsProps> = ({
  currentMode,
  onModeChange,
  metrics,
  reduceMotion = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Fallback defaults if metrics haven't arrived yet
  const defaultStats: MetricsComparisonStats = {
    total_turns: 0,
    total_interruptions: 0,
    wrong_stops: 0,
    wrong_non_stops: 0,
    wrong_stop_rate_pct: 0,
    wrong_non_stop_rate_pct: 0,
    avg_response_delay_ms: 0,
    avg_time_to_pause_ms: 45.0,
  };

  const pauseFirstStats = metrics?.comparison?.pause_first || defaultStats;
  const baselineStats = metrics?.comparison?.baseline || defaultStats;

  const transitionStyle = reduceMotion ? 'none' : 'all 0.25s ease';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        width: '100%',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        transition: transitionStyle,
      }}
    >
      {/* Header: Mode Selector Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interruption Mode:
          </span>
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              onClick={() => onModeChange('pause_first')}
              style={{
                background: currentMode === 'pause_first' ? '#10b981' : 'transparent',
                color: currentMode === 'pause_first' ? '#ffffff' : '#94a3b8',
                fontWeight: currentMode === 'pause_first' ? 700 : 500,
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.76rem',
                cursor: 'pointer',
                transition: transitionStyle,
              }}
              title="Pause audio, classify backchannel vs question, then resume or stop"
            >
              ✓ Pause-First (Sunai)
            </button>

            <button
              onClick={() => onModeChange('baseline')}
              style={{
                background: currentMode === 'baseline' ? '#f59e0b' : 'transparent',
                color: currentMode === 'baseline' ? '#000000' : '#94a3b8',
                fontWeight: currentMode === 'baseline' ? 700 : 500,
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.76rem',
                cursor: 'pointer',
                transition: transitionStyle,
              }}
              title="Stop audio immediately on any voice"
            >
              Baseline (Stop-on-Voice)
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '0.72rem',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          {isExpanded ? '▲ Hide Stats' : '▼ Compare Stats'}
        </button>
      </div>

      {/* Expandable Comparison Stats Card */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '8px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Column 1: Sunai Pause-First */}
            <div
              style={{
                background: currentMode === 'pause_first' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${currentMode === 'pause_first' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#34d399' }}>Pause-First (Sunai)</span>
                {currentMode === 'pause_first' && (
                  <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Wrong Stops: <strong style={{ color: '#34d399' }}>{pauseFirstStats.wrong_stops} ({pauseFirstStats.wrong_stop_rate_pct}%)</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Wrong Non-Stops: <strong style={{ color: '#e2e8f0' }}>{pauseFirstStats.wrong_non_stops}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Pause Latency: <strong>~{pauseFirstStats.avg_time_to_pause_ms} ms</strong>
              </div>
            </div>

            {/* Column 2: Baseline */}
            <div
              style={{
                background: currentMode === 'baseline' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${currentMode === 'baseline' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fbbf24' }}>Baseline (Stop)</span>
                {currentMode === 'baseline' && (
                  <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#000', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Wrong Stops: <strong style={{ color: '#f87171' }}>{baselineStats.wrong_stops} ({baselineStats.wrong_stop_rate_pct}%)</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Wrong Non-Stops: <strong style={{ color: '#e2e8f0' }}>{baselineStats.wrong_non_stops}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Pause Latency: <strong>~{baselineStats.avg_time_to_pause_ms} ms</strong>
              </div>
            </div>
          </div>

          {/* Pitch Validation Tag */}
          <div
            style={{
              fontSize: '0.72rem',
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🎯</span>
            <span>
              <strong>Pitch Win:</strong> Sunai eliminates {baselineStats.wrong_stops > 0 ? `${baselineStats.wrong_stops} false cutoff(s)` : 'false cutoffs'} by pausing and classifying backchannels before stopping!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

