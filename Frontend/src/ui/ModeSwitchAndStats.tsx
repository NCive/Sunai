import React, { useState } from 'react';
import { MetricsPayload, MetricsComparisonStats } from '../ws/client';
import { TargetIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

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

  const transitionStyle = reduceMotion ? 'none' : 'all 0.2s ease';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
      }}
    >
      {/* Interruption Mode Segmented Control (Two Equal Options) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          role="radiogroup"
          aria-label="Interruption Mode"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            background: 'var(--space-black)',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid var(--space-blue-70)',
          }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={currentMode === 'pause_first'}
            onClick={() => onModeChange('pause_first')}
            style={{
              background: currentMode === 'pause_first' ? 'var(--space-blue)' : 'transparent',
              color: 'var(--space-star)',
              border: `1px solid ${currentMode === 'pause_first' ? 'var(--space-gold)' : 'transparent'}`,
              borderRadius: '4px',
              padding: '6px 8px',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textAlign: 'center',
              boxShadow: currentMode === 'pause_first' ? '0 0 10px var(--space-gold-glow)' : 'none',
              transition: transitionStyle,
            }}
          >
            Pause-First
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={currentMode === 'baseline'}
            onClick={() => onModeChange('baseline')}
            style={{
              background: currentMode === 'baseline' ? 'var(--space-blue)' : 'transparent',
              color: 'var(--space-star)',
              border: `1px solid ${currentMode === 'baseline' ? 'var(--space-gold)' : 'transparent'}`,
              borderRadius: '4px',
              padding: '6px 8px',
              fontFamily: 'var(--font-hud)',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textAlign: 'center',
              boxShadow: currentMode === 'baseline' ? '0 0 10px var(--space-gold-glow)' : 'none',
              transition: transitionStyle,
            }}
          >
            Baseline
          </button>
        </div>

        {/* Helper text below segmented control */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: 'var(--space-star-70)',
            padding: '0 4px',
          }}
        >
          <span>Intelligent classify & resume</span>
          <span>Stop-on-Voice immediately</span>
        </div>
      </div>

      {/* Expand/Collapse Toggle Button for Comparative Stats */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--space-star-70)',
            fontSize: '0.68rem',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon size={12} />
              <span>Hide Details</span>
            </>
          ) : (
            <>
              <ChevronDownIcon size={12} />
              <span>Compare Stats</span>
            </>
          )}
        </button>
      </div>

      {/* Stats Cards (Pause-First vs Baseline): Two Equal Cards Side by Side */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Card 1: Pause-First */}
            <div
              style={{
                background: currentMode === 'pause_first' ? 'var(--space-blue-20)' : 'var(--space-navy-90)',
                border: `1px solid ${currentMode === 'pause_first' ? 'var(--space-gold)' : 'var(--space-blue-40)'}`,
                borderRadius: '6px',
                padding: '10px 10px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 700, fontFamily: 'var(--font-hud)', letterSpacing: '0.04em', color: 'var(--space-star)' }}>
                  Pause-First
                </span>
                {currentMode === 'pause_first' && (
                  <span
                    style={{
                      fontSize: '0.60rem',
                      background: 'var(--space-gold)',
                      color: 'var(--space-black)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-hud)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Big Number: Wrong Stops % */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--decision-green)', lineHeight: 1 }}>
                  {pauseFirstStats.wrong_stop_rate_pct}%
                </span>
                <span style={{ fontSize: '0.64rem', color: 'var(--space-star-70)' }}>
                  wrong stops
                </span>
              </div>

              {/* Thin Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '3px',
                  background: 'var(--space-black)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(2, pauseFirstStats.wrong_stop_rate_pct)}%`,
                    height: '100%',
                    background: 'var(--decision-green)',
                  }}
                />
              </div>

              {/* Counts & Latency */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.66rem', color: 'var(--space-star-70)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cutoffs:</span>
                  <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>
                    {pauseFirstStats.wrong_stops}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pause Time:</span>
                  <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>
                    ~{pauseFirstStats.avg_time_to_pause_ms} ms
                  </strong>
                </div>
              </div>
            </div>

            {/* Card 2: Baseline */}
            <div
              style={{
                background: currentMode === 'baseline' ? 'var(--space-blue-20)' : 'var(--space-navy-90)',
                border: `1px solid ${currentMode === 'baseline' ? 'var(--space-gold)' : 'var(--space-blue-40)'}`,
                borderRadius: '6px',
                padding: '10px 10px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 700, fontFamily: 'var(--font-hud)', letterSpacing: '0.04em', color: 'var(--space-star)' }}>
                  Baseline
                </span>
                {currentMode === 'baseline' && (
                  <span
                    style={{
                      fontSize: '0.60rem',
                      background: 'var(--space-gold)',
                      color: 'var(--space-black)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-hud)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Big Number: Wrong Stops % */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--decision-red)', lineHeight: 1 }}>
                  {baselineStats.wrong_stop_rate_pct}%
                </span>
                <span style={{ fontSize: '0.64rem', color: 'var(--space-star-70)' }}>
                  wrong stops
                </span>
              </div>

              {/* Thin Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '3px',
                  background: 'var(--space-black)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(2, baselineStats.wrong_stop_rate_pct)}%`,
                    height: '100%',
                    background: 'var(--decision-red)',
                  }}
                />
              </div>

              {/* Counts & Latency */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.66rem', color: 'var(--space-star-70)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cutoffs:</span>
                  <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>
                    {baselineStats.wrong_stops}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pause Time:</span>
                  <strong className="tabular-nums" style={{ color: 'var(--space-star)' }}>
                    ~{baselineStats.avg_time_to_pause_ms} ms
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Pitch Validation Note */}
          <div
            style={{
              fontSize: '0.68rem',
              color: 'var(--space-star)',
              background: 'var(--space-blue-20)',
              border: '1px solid var(--space-blue-70)',
              borderRadius: '4px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              lineHeight: 1.35,
            }}
          >
            <TargetIcon size={14} color="var(--space-gold)" />
            <span>
              <strong>Zero False Cutoffs:</strong> Pause-First pauses and classifies backchannels before deciding to stop.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
