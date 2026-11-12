import React, { useEffect, useState, useRef } from 'react';
import { SphereState, DecisionType } from '../sphere/SphereRenderer';
import { CONFIG } from '../config';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

export interface TimelineBlock {
  id: string;
  lane: 'user' | 'bot' | 'pause_gap';
  startTime: number;
  durationMs: number;
  label: string;
  isLive: boolean;
  decision?: DecisionType;
}

export interface ConversationTimelineProps {
  currentState: SphereState;
  isUserSpeaking: boolean;
  activeDecision: DecisionType | null;
  reduceMotion?: boolean;
  lowPower?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  currentState,
  isUserSpeaking,
  activeDecision,
  reduceMotion = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const activeBlockRef = useRef<TimelineBlock | null>(null);

  // Track live blocks as states transition
  useEffect(() => {
    const now = Date.now();

    // 1. If user starts speaking (LISTENING with voice)
    if (isUserSpeaking && (!activeBlockRef.current || activeBlockRef.current.lane !== 'user')) {
      if (activeBlockRef.current) {
        activeBlockRef.current.isLive = false;
        activeBlockRef.current.durationMs = Math.max(200, now - activeBlockRef.current.startTime);
      }
      const newBlock: TimelineBlock = {
        id: `user_${now}`,
        lane: 'user',
        startTime: now,
        durationMs: 300,
        label: 'User Speech',
        isLive: true,
      };
      activeBlockRef.current = newBlock;
      setBlocks((prev) => [...prev.slice(-12), newBlock]);
    }

    // 2. Bot Speaking
    else if (currentState === 'SPEAKING' && (!activeBlockRef.current || activeBlockRef.current.lane !== 'bot')) {
      if (activeBlockRef.current) {
        activeBlockRef.current.isLive = false;
        activeBlockRef.current.durationMs = Math.max(200, now - activeBlockRef.current.startTime);
      }
      const newBlock: TimelineBlock = {
        id: `bot_${now}`,
        lane: 'bot',
        startTime: now,
        durationMs: 400,
        label: 'Bot Audio',
        isLive: true,
      };
      activeBlockRef.current = newBlock;
      setBlocks((prev) => [...prev.slice(-12), newBlock]);
    }

    // 3. Paused State: Create the characteristic PAUSE GAP in the bot lane
    else if (currentState === 'PAUSED' && (!activeBlockRef.current || activeBlockRef.current.lane !== 'pause_gap')) {
      if (activeBlockRef.current) {
        activeBlockRef.current.isLive = false;
        activeBlockRef.current.durationMs = Math.max(200, now - activeBlockRef.current.startTime);
      }
      const newBlock: TimelineBlock = {
        id: `gap_${now}`,
        lane: 'pause_gap',
        startTime: now,
        durationMs: 400,
        label: 'PAUSE CHECK (300-500ms)',
        isLive: true,
      };
      activeBlockRef.current = newBlock;
      setBlocks((prev) => [...prev.slice(-12), newBlock]);
    }

    // 4. Idle or finalized
    else if (currentState === 'IDLE' || currentState === 'SLEEP') {
      if (activeBlockRef.current) {
        activeBlockRef.current.isLive = false;
        activeBlockRef.current.durationMs = Math.max(200, now - activeBlockRef.current.startTime);
        activeBlockRef.current = null;
      }
    }
  }, [currentState, isUserSpeaking]);

  // Associate decision with active pause gap
  useEffect(() => {
    if (activeDecision && activeBlockRef.current && activeBlockRef.current.lane === 'pause_gap') {
      activeBlockRef.current.decision = activeDecision;
      setBlocks((prev) => [...prev]);
    }
  }, [activeDecision]);

  // Live timer for active block expansion
  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      if (activeBlockRef.current && activeBlockRef.current.isLive) {
        const now = Date.now();
        activeBlockRef.current.durationMs = Math.max(200, now - activeBlockRef.current.startTime);
        setBlocks((prev) => [...prev]);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const userBlocks = blocks.filter((b) => b.lane === 'user');
  const botBlocks = blocks.filter((b) => b.lane === 'bot' || b.lane === 'pause_gap');

  // Collapsed View (Slim Strip: 34px)
  if (isCollapsed) {
    return (
      <div
        className="sunai-timeline-collapsed"
        style={{
          width: '100%',
          height: `${CONFIG.layout.timelineCollapsedHeightPx}px`,
          background: 'var(--space-navy-95)',
          borderTop: '1px solid var(--space-blue-70)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockIcon size={14} color="var(--space-gold)" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-hud)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--space-star)' }}>
            Timeline
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--space-star-70)' }}>
            ({blocks.length} events logged)
          </span>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--space-star-70)',
              fontSize: '0.68rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
            }}
          >
            <ChevronUpIcon size={12} />
            <span>Expand</span>
          </button>
        )}
      </div>
    );
  }

  // Expanded View (Full Two-Lane Taskbar: 120px)
  return (
    <div
      className="sunai-timeline-expanded"
      style={{
        width: '100%',
        height: `${CONFIG.layout.timelineHeightPx}px`,
        background: 'var(--space-navy-95)',
        borderTop: '1px solid var(--space-blue-70)',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        boxSizing: 'border-box',
        gap: '14px',
        zIndex: 10,
      }}
    >
      {/* Left Column: Title & Controls */}
      <div
        style={{
          width: '150px',
          minWidth: '130px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          borderRight: '1px solid var(--space-blue-40)',
          paddingRight: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClockIcon size={14} color="var(--space-gold)" />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                fontFamily: 'var(--font-hud)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--space-star)',
              }}
            >
              Timeline
            </span>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--space-star-70)',
                fontSize: '0.66rem',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
              title="Collapse timeline to thin strip"
            >
              <ChevronDownIcon size={12} />
              <span>Hide</span>
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.66rem', color: 'var(--space-star-50)', lineHeight: 1.25 }}>
          Instant pause & backchannel classification
        </span>
      </div>

      {/* Right Column: Stacked User and Bot Lanes */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: 0,
          justifyContent: 'center',
        }}
      >
        {/* Lane 1: User Lane */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '38px',
              fontSize: '0.70rem',
              fontWeight: 700,
              fontFamily: 'var(--font-hud)',
              color: 'var(--space-star)',
              letterSpacing: '0.04em',
            }}
          >
            User
          </span>
          <div
            style={{
              flex: 1,
              height: '24px',
              background: 'var(--space-black)',
              border: '1px dashed var(--space-blue-40)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {userBlocks.length === 0 ? (
              <span style={{ fontSize: '0.66rem', color: 'var(--space-star-50)', fontStyle: 'italic' }}>
                Awaiting user voice input...
              </span>
            ) : (
              userBlocks.map((b) => {
                const widthPx = Math.min(220, Math.max(48, Math.round(b.durationMs / 25)));
                return (
                  <div
                    key={b.id}
                    className="tabular-nums"
                    style={{
                      height: '18px',
                      width: `${widthPx}px`,
                      minWidth: '48px',
                      flexShrink: 0,
                      background: 'var(--space-star)',
                      color: 'var(--space-black)',
                      border: '1px solid var(--space-blue)',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      boxShadow: b.isLive ? '0 0 10px rgba(71, 127, 245, 0.5)' : 'none',
                    }}
                  >
                    {b.durationMs} ms
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lane 2: Bot Lane (Audio & Pause Gap) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '38px',
              fontSize: '0.70rem',
              fontWeight: 700,
              fontFamily: 'var(--font-hud)',
              color: 'var(--space-gold)',
              letterSpacing: '0.04em',
            }}
          >
            Bot
          </span>
          <div
            style={{
              flex: 1,
              height: '24px',
              background: 'var(--space-black)',
              border: '1px dashed var(--space-blue-40)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {botBlocks.length === 0 ? (
              <span style={{ fontSize: '0.66rem', color: 'var(--space-star-50)', fontStyle: 'italic' }}>
                Awaiting assistant synthesized audio...
              </span>
            ) : (
              botBlocks.map((b) => {
                const isPauseGap = b.lane === 'pause_gap';
                const widthPx = Math.min(220, Math.max(56, Math.round(b.durationMs / 25)));

                return (
                  <div
                    key={b.id}
                    className="tabular-nums"
                    style={{
                      height: '18px',
                      width: `${widthPx}px`,
                      minWidth: '56px',
                      flexShrink: 0,
                      background: isPauseGap ? 'var(--decision-amber-bg)' : 'var(--space-gold)',
                      color: isPauseGap ? 'var(--decision-amber)' : 'var(--space-black)',
                      border: `1px solid ${isPauseGap ? 'var(--decision-amber-border)' : 'var(--space-gold)'}`,
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      boxShadow: b.isLive
                        ? isPauseGap
                          ? '0 0 10px rgba(255, 209, 102, 0.45)'
                          : '0 0 10px var(--space-gold-glow)'
                        : 'none',
                    }}
                  >
                    {isPauseGap ? `PAUSE (${b.durationMs}ms)` : `${b.durationMs} ms`}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Subtle timeline track ticks */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: '46px',
            fontSize: '0.58rem',
            color: 'var(--space-star-50)',
            fontFamily: 'var(--font-hud)',
          }}
        >
          <span>0s</span>
          <span>1s</span>
          <span>2s</span>
          <span>3s</span>
          <span>4s</span>
          <span>5s+</span>
        </div>
      </div>
    </div>
  );
};
