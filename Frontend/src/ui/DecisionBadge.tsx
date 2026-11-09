import React, { useEffect, useState } from 'react';
import { DecisionType } from '../sphere/SphereRenderer';

export interface DecisionBadgeProps {
  decision: DecisionType | null;
  text?: string;
  durationMs?: number;
  reduceMotion?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

interface DecisionConfig {
  label: string;
  sublabel: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
}

const DECISION_LOOKUP: Record<DecisionType, DecisionConfig> = {
  noise: {
    label: 'Noise Ignored',
    sublabel: 'Acoustic artifact filtered • Resuming playback',
    bgColor: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    textColor: '#4ade80',
    icon: '🛡️',
  },
  small_sound: {
    label: 'Backchannel Detected',
    sublabel: 'User nodded / murmured ("Haan", "Hmm") • Resuming playback',
    bgColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    textColor: '#34d399',
    icon: '👂',
  },
  go_on: {
    label: 'Go-On Command',
    sublabel: 'User prompted ("Aage bolo") • Continuing remaining sentences',
    bgColor: 'rgba(6, 182, 212, 0.18)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    textColor: '#38bdf8',
    icon: '▶️',
  },
  interruption: {
    label: 'Interruption Confirmed',
    sublabel: 'Stop word or question detected • Stopping and listening',
    bgColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    textColor: '#f87171',
    icon: '🛑',
  },
  unclear: {
    label: 'Unclear Vocalization',
    sublabel: 'Voice detected without clear words • Asking "Ji?"',
    bgColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    textColor: '#fbbf24',
    icon: '❓',
  },
};

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({
  decision,
  text,
  durationMs = 2800,
  reduceMotion = false,
  style,
  className = '',
}) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [activeDecision, setActiveDecision] = useState<DecisionType | null>(null);

  useEffect(() => {
    if (decision) {
      setActiveDecision(decision);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, durationMs);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [decision, durationMs]);

  if (!activeDecision || !visible) {
    return null;
  }

  const config = DECISION_LOOKUP[activeDecision] || DECISION_LOOKUP.noise;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        transform: !reduceMotion && visible ? 'scale(1)' : 'scale(0.92)',
        opacity: visible ? 1 : 0,
        transition: reduceMotion
          ? 'opacity 0.2s ease'
          : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        background: config.bgColor,
        border: `1.5px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '8px 18px',
        backdropFilter: 'blur(14px)',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px ${config.borderColor}`,
        zIndex: 30,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '90vw',
        ...style,
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{config.icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: config.textColor, letterSpacing: '0.02em' }}>
            {config.label}
          </span>
          {text && (
            <span
              style={{
                fontSize: '0.74rem',
                color: '#cbd5e1',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              "{text}"
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
          {config.sublabel}
        </span>
      </div>
    </div>
  );
};

