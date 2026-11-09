import React from 'react';

export interface SentenceItem {
  id: number;
  text: string;
}

export interface LiveCaptionsProps {
  userText: string;
  isUserSpeaking: boolean;
  botSentences: SentenceItem[];
  activeSentenceId: number | string | null;
  heardUpto: number;
  isInterrupted: boolean;
  isContinuation: boolean;
  reduceMotion?: boolean;
}

export const LiveCaptions: React.FC<LiveCaptionsProps> = ({
  userText,
  isUserSpeaking,
  botSentences,
  activeSentenceId,
  heardUpto,
  isInterrupted,
  isContinuation,
  reduceMotion = false,
}) => {
  const hasUserText = Boolean(userText && userText.trim().length > 0);
  const hasBotText = botSentences.length > 0;

  if (!hasUserText && !hasBotText) {
    return null;
  }

  const transitionStyle = reduceMotion ? 'none' : 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '720px',
        padding: '0 16px',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* User Live Caption */}
      {hasUserText && (
        <div
          style={{
            alignSelf: 'flex-start',
            maxWidth: '85%',
            background: 'rgba(30, 41, 59, 0.75)',
            border: `1px solid ${isUserSpeaking ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '14px',
            padding: '10px 16px',
            color: '#f8fafc',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            boxShadow: isUserSpeaking ? '0 0 16px rgba(56, 189, 248, 0.25)' : '0 4px 16px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(12px)',
            transition: transitionStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isUserSpeaking ? '#38bdf8' : '#94a3b8',
                boxShadow: isUserSpeaking ? '0 0 8px #38bdf8' : 'none',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              You {isUserSpeaking ? '(Speaking...)' : ''}
            </span>
          </div>
          <div>{userText}</div>
        </div>
      )}

      {/* Bot Numbered Sentences with Heard/Unplayed Dynamic Highlighting */}
      {hasBotText && (
        <div
          style={{
            alignSelf: 'flex-end',
            maxWidth: '92%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '12px 18px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(14px)',
            transition: transitionStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isInterrupted ? '#ef4444' : '#10b981',
                  boxShadow: isInterrupted ? '0 0 8px #ef4444' : '0 0 8px #10b981',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>
                SUNAI {isInterrupted ? '(Paused/Interrupted)' : ''} {isContinuation ? '(Resumed)' : ''}
              </span>
            </div>
            {isInterrupted && !isContinuation && (
              <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>
                Unplayed sentences faded • Say "Go on" to continue
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {botSentences.map((sent) => {
              const isHeard = sent.id <= heardUpto;
              const isActive = activeSentenceId !== null && String(sent.id) === String(activeSentenceId);
              const isUnplayed = sent.id > heardUpto;

              // When interrupted, unplayed sentences fade away unless resumed via go on
              const shouldFadeOut = isInterrupted && !isContinuation && isUnplayed;

              return (
                <div
                  key={sent.id}
                  style={{
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    transition: transitionStyle,
                    color: isHeard ? '#ffffff' : isActive ? '#e0f2fe' : '#64748b',
                    opacity: shouldFadeOut ? 0.18 : isUnplayed ? 0.55 : 1.0,
                    fontWeight: isHeard || isActive ? 500 : 400,
                    transform: shouldFadeOut && !reduceMotion ? 'translateX(6px)' : 'none',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isActive ? '#38bdf8' : isHeard ? '#10b981' : '#475569',
                      minWidth: '18px',
                    }}
                  >
                    {sent.id}.
                  </span>
                  <span
                    style={{
                      borderBottom: isActive ? '1px dashed rgba(56, 189, 248, 0.6)' : 'none',
                      paddingBottom: isActive ? '1px' : 0,
                    }}
                  >
                    {sent.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

