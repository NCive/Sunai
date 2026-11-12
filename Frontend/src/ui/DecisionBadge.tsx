import React, { useEffect, useState } from 'react';
import { DecisionType } from '../sphere/SphereRenderer';
import { ShieldIcon, ActivityIcon, PlayIcon, StopIcon, HelpCircleIcon } from './Icons';

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
  icon: React.ReactNode;
}

const DECISION_LOOKUP: Record<DecisionType, DecisionConfig> = {
  noise: {
    label: 'Noise Filtered',
    sublabel: 'Acoustic artifact filtered • Resuming playback',
    bgColor: 'var(--decision-green-bg)',
    borderColor: 'var(--decision-green-border)',
    textColor: 'var(--decision-green)',
    icon: <ShieldIcon size={16} color="var(--decision-green)" />,
  },
  small_sound: {
    label: 'Backchannel Detected',
    sublabel: 'User murmured ("Haan", "Hmm") • Resuming playback',
    bgColor: 'var(--decision-green-bg)',
    borderColor: 'var(--decision-green-border)',
    textColor: 'var(--decision-green)',
    icon: <ActivityIcon size={16} color="var(--decision-green)" />,
  },
  go_on: {
    label: 'Go-On Command',
    sublabel: 'User prompted ("Aage bolo") • Continuing remaining sentences',
    bgColor: 'var(--decision-green-bg)',
    borderColor: 'var(--decision-green-border)',
    textColor: 'var(--decision-green)',
    icon: <PlayIcon size={16} color="var(--decision-green)" />,
  },
  interruption: {
    label: 'Interruption Confirmed',
    sublabel: 'Stop word or question detected • Stopping audio & listening',
    bgColor: 'var(--decision-red-bg)',
    borderColor: 'var(--decision-red-border)',
    textColor: 'var(--decision-red)',
    icon: <StopIcon size={16} color="var(--decision-red)" />,
  },
  unclear: {
    label: 'Unclear Vocalization',
    sublabel: 'Voice detected without clear words • Asking "Ji?"',
    bgColor: 'var(--decision-amber-bg)',
    borderColor: 'var(--decision-amber-border)',
    textColor: 'var(--decision-amber)',
    icon: <HelpCircleIcon size={16} color="var(--decision-amber)" />,
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
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        transform: !reduceMotion && visible ? 'scale(1)' : 'scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: reduceMotion ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--space-navy-88)',
          border: `1px solid ${config.borderColor}`,
          borderRadius: '6px',
          padding: '8px 16px',
          boxShadow: `0 0 20px ${config.bgColor}, 0 4px 16px rgba(0, 0, 0, 0.6)`,
          maxWidth: '520px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            background: config.bgColor,
            border: `1px solid ${config.borderColor}`,
            flexShrink: 0,
          }}
        >
          {config.icon}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: config.textColor,
              }}
            >
              {text || config.label}
            </span>
          </div>

          <span
            style={{
              fontSize: '0.70rem',
              color: 'var(--space-star-70)',
              lineHeight: 1.3,
            }}
          >
            {config.sublabel}
          </span>
        </div>
      </div>
    </div>
  );
};
