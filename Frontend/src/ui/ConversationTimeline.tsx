import React, { useEffect, useState, useRef } from 'react';
import { SphereState, DecisionType } from '../sphere/SphereRenderer';
import { CONFIG } from '../config';

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
  lowPower = false,
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

  // Update live block duration periodically
  useEffect(() => {
    if (lowPower) return; // Reduce render frequency in low-power mode

    const interval = setInterval(() => {
      if (activeBlockRef.current && activeBlockRef.current.isLive) {
        const elapsed = Date.now() - activeBlockRef.current.startTime;
        activeBlockRef.current.durationMs = elapsed;
        setBlocks((prev) => [...prev]);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lowPower]);

  // If a decision arrives, attach it to active or latest block
  useEffect(() => {
    if (activeDecision && blocks.length > 0) {
      setBlocks((prev) => {
        const last = { ...prev[prev.length - 1], decision: activeDecision };
        return [...prev.slice(0, -1), last];
      });
    }
  }, [activeDecision]);

  const userBlocks = blocks.filter((b) => b.lane === 'user');
  const botBlocks = blocks.filter((b) => b.lane === 'bot' || b.lane === 'pause_gap');

  // If collapsed: render compact taskbar strip
  if (isCollapsed) {
    return (
      <div
        className="timeline-taskbar collapsed"
        style={{
          width: '100%',
          height: `${CONFIG.layout.timelineCollapsedHeightPx}px`,
          background: 'rgba(10, 15, 30, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>
            ⏱️ CONVERSATION TIMELINE
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            {blocks.length} events
          </span>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
            title="Expand conversation timeline"
          >
            ▲ Expand Timeline
          </button>
        )}
      </div>
    );
  }

  // Expanded taskbar style (~120px)
  return (
    <div
      className="timeline-taskbar expanded"
      style={{
        width: '100%',
        height: `${CONFIG.layout.timelineHeightPx}px`,
        background: 'rgba(10, 15, 30, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        boxSizing: 'border-box',
        backdropFilter: 'blur(12px)',
        gap: '16px',
        zIndex: 10,
      }}
    >
      {/* Left Column: Title & Controls */}
      <div
        style={{
          width: '160px',
          minWidth: '140px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          paddingRight: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#e2e8f0',
            }}
          >
            ⏱️ Timeline
          </span>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.7rem',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
              }}
              title="Collapse timeline to thin strip"
            >
              ▼ Hide
            </button>
          )}
        </div>
        <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.2 }}>
          Instant pause & backchannel timing
        </span>
      </div>

      {/* Right Column: Stacked User and Bot Lanes */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: 0,
          justifyContent: 'center',
        }}
      >
        {/* Lane 1: User Lane (~28px) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '36px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#38bdf8',
              letterSpacing: '0.02em',
            }}
          >
            User
          </span>
          <div
            style={{
              flex: 1,
              height: '26px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {userBlocks.length === 0 ? (
              <span style={{ fontSize: '0.68rem', color: '#475569', fontStyle: 'italic' }}>
                Awaiting user speech...
              </span>
            ) : (
              userBlocks.map((b) => {
                const widthPx = Math.min(220, Math.max(40, Math.round(b.durationMs / 25)));
                return (
                  <div
                    key={b.id}
                    style={{
                      height: '20px',
                      width: `${widthPx}px`,
                      minWidth: '40px',
                      flexShrink: 0,
                      background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      boxShadow: b.isLive ? '0 0 10px rgba(56, 189, 248, 0.5)' : 'none',
                    }}
                  >
                    {b.durationMs}ms
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lane 2: Bot Lane (~28px, Speech + Pause Gap) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '36px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#10b981',
              letterSpacing: '0.02em',
            }}
          >
            Bot
          </span>
          <div
            style={{
              flex: 1,
              height: '26px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {botBlocks.length === 0 ? (
              <span style={{ fontSize: '0.68rem', color: '#475569', fontStyle: 'italic' }}>
                Awaiting assistant speech...
              </span>
            ) : (
              botBlocks.map((b) => {
                const widthPx = Math.min(240, Math.max(40, Math.round(b.durationMs / 25)));

                if (b.lane === 'pause_gap') {
                  return (
                    <div
                      key={b.id}
                      style={{
                        height: '20px',
                        width: `${Math.max(70, widthPx)}px`,
                        minWidth: '70px',
                        flexShrink: 0,
                        background:
                          'repeating-linear-gradient(45deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.25) 4px, rgba(245, 158, 11, 0.5) 4px, rgba(245, 158, 11, 0.5) 8px)',
                        border: '1px dashed #f59e0b',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        color: '#fbbf24',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        animation: reduceMotion ? 'none' : 'pulse 1s infinite',
                      }}
                      title="Pause Check Window: Audio paused instantly, evaluating classification"
                    >
                      GAP ({b.durationMs}ms)
                    </div>
                  );
                }

                return (
                  <div
                    key={b.id}
                    style={{
                      height: '20px',
                      width: `${widthPx}px`,
                      minWidth: '40px',
                      flexShrink: 0,
                      background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      color: '#ffffff',
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      boxShadow: b.isLive ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
                    }}
                  >
                    Audio ({b.durationMs}ms)
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
