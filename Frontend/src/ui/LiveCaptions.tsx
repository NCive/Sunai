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

  const transitionStyle = reduceMotion ? 'none' : 'all 0.25s ease';

  return (
    <div
      role="region"
      aria-label="Live Captions"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        maxWidth: '740px',
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
            background: 'var(--space-navy-90)',
            border: `1px solid ${isUserSpeaking ? 'var(--space-gold)' : 'var(--space-blue-70)'}`,
            borderRadius: '6px',
            padding: '10px 16px',
            color: 'var(--space-star)',
            fontFamily: 'var(--font-indic)',
            fontSize: '1rem',
            lineHeight: 1.5,
            boxShadow: isUserSpeaking ? '0 0 16px var(--space-gold-glow)' : '0 4px 16px rgba(0, 0, 0, 0.4)',
            transition: transitionStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isUserSpeaking ? 'var(--decision-green)' : 'var(--space-star-70)',
                boxShadow: isUserSpeaking ? '0 0 8px var(--decision-green)' : 'none',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-hud)',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--space-star-70)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
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
            background: 'var(--space-navy-90)',
            border: '1px solid var(--space-blue-70)',
            borderRadius: '6px',
            padding: '12px 18px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            transition: transitionStyle,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isInterrupted ? 'var(--decision-red)' : 'var(--decision-green)',
                  boxShadow: isInterrupted ? '0 0 8px var(--decision-red)' : '0 0 8px var(--decision-green)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-hud)',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: 'var(--space-gold)',
                  letterSpacing: '0.08em',
                }}
              >
                SUNAI {isInterrupted ? '(Paused/Interrupted)' : ''} {isContinuation ? '(Resumed)' : ''}
              </span>
            </div>
            {isInterrupted && !isContinuation && (
              <span style={{ fontSize: '0.68rem', color: 'var(--decision-red)', fontWeight: 600 }}>
                Unplayed sentences faded • Say "Go on" to continue
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {botSentences.map((sent) => {
              const isHeard = sent.id <= heardUpto;
              const isActive = activeSentenceId !== null && String(sent.id) === String(activeSentenceId);
              const isUnplayed = sent.id > heardUpto;

              const shouldFadeOut = isInterrupted && !isContinuation && isUnplayed;

              return (
                <div
                  key={sent.id}
                  style={{
                    fontFamily: 'var(--font-indic)',
                    fontSize: '1rem',
                    lineHeight: 1.55,
                    transition: transitionStyle,
                    color: isHeard
                      ? 'var(--space-star)'
                      : isActive
                      ? 'var(--space-gold)'
                      : 'var(--space-star-70)',
                    opacity: shouldFadeOut ? 0.2 : isUnplayed ? 0.6 : 1.0,
                    fontWeight: isHeard || isActive ? 500 : 400,
                    transform: shouldFadeOut && !reduceMotion ? 'translateX(6px)' : 'none',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                  }}
                >
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: isActive ? 'var(--space-gold)' : isHeard ? 'var(--decision-green)' : 'var(--space-star-50)',
                      minWidth: '20px',
                    }}
                  >
                    {sent.id}.
                  </span>
                  <span
                    style={{
                      borderBottom: isActive ? '1px dashed var(--space-gold)' : 'none',
                      paddingBottom: isActive ? '1px' : 0,
                      textShadow: isActive ? '0 0 10px var(--space-gold-glow)' : 'none',
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
