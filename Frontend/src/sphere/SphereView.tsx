import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  SphereRenderer,
  SphereState,
  DecisionType,
} from './SphereRenderer';
import { SphereErrorBoundary } from './SphereErrorBoundary';

export interface SphereViewProps {
  state: SphereState;
  micAnalyser?: AnalyserNode | null;
  playAnalyser?: AnalyserNode | null;
  decision?: DecisionType | null;
  lowPower?: boolean;
  reduceMotion?: boolean;
  onFps?: (fps: number) => void;
  className?: string;
}

export interface SphereViewHandle {
  setDecision: (decision: DecisionType) => void;
  setState: (state: SphereState) => void;
  resize: () => void;
}

const STATE_HINTS: Record<SphereState, string> = {
  IDLE: 'Press Start Mic to begin',
  LISTENING: 'Listening for your voice (16 kHz PCM)...',
  THINKING: 'Synthesizing response & routing...',
  SPEAKING: 'Speaking response • Interruption monitor active',
  PAUSED: 'Audio paused • Classifying voice (300-500 ms)...',
  IDLE_CHECK: 'Verifying audio channel...',
  SLEEP: 'Assistant in low-power standby',
  WAKE: 'Initializing audio stream...',
};

const SphereInner = forwardRef<SphereViewHandle, SphereViewProps>(
  (
    {
      state,
      micAnalyser = null,
      playAnalyser = null,
      decision = null,
      lowPower = false,
      reduceMotion = false,
      onFps,
      className,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<SphereRenderer | null>(null);

    useImperativeHandle(ref, () => ({
      setDecision: (dec: DecisionType) => {
        rendererRef.current?.setDecision(dec);
      },
      setState: (st: SphereState) => {
        rendererRef.current?.setState(st);
      },
      resize: () => {
        rendererRef.current?.handleResize();
      },
    }));

    // Mount renderer
    useEffect(() => {
      if (!containerRef.current) return;

      const renderer = new SphereRenderer(containerRef.current, {
        lowPower,
        reduceMotion,
        onFps,
      });
      rendererRef.current = renderer;

      return () => {
        renderer.destroy();
        rendererRef.current = null;
      };
    }, []);

    // Sync audio sources
    useEffect(() => {
      rendererRef.current?.setAudioSources(micAnalyser, playAnalyser);
    }, [micAnalyser, playAnalyser]);

    // Sync state
    useEffect(() => {
      rendererRef.current?.setState(state);
    }, [state]);

    // Sync decision
    useEffect(() => {
      if (decision) {
        rendererRef.current?.setDecision(decision);
      }
    }, [decision]);

    // Sync config overrides
    useEffect(() => {
      rendererRef.current?.setConfigOverrides({ lowPower, reduceMotion });
    }, [lowPower, reduceMotion]);

    const hintText = STATE_HINTS[state] || STATE_HINTS.IDLE;

    return (
      <div
        className={`sphere-stage-wrapper ${className || ''}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Soft blue-gold nebula glow behind the sphere */}
        <div
          style={{
            position: 'absolute',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42, 79, 154, 0.35) 0%, rgba(200, 154, 94, 0.15) 35%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
            transform: 'translateZ(0)',
          }}
        />

        {/* HUD Framed Corner Brackets around stage */}
        <div
          style={{
            position: 'absolute',
            inset: '24px',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {/* Top-left bracket */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '18px',
              height: '18px',
              borderTop: '2px solid rgba(242, 244, 255, 0.45)',
              borderLeft: '2px solid rgba(242, 244, 255, 0.45)',
            }}
          />
          {/* Top-right bracket */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '18px',
              height: '18px',
              borderTop: '2px solid rgba(242, 244, 255, 0.45)',
              borderRight: '2px solid rgba(242, 244, 255, 0.45)',
            }}
          />
          {/* Bottom-left bracket */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '18px',
              height: '18px',
              borderBottom: '2px solid rgba(242, 244, 255, 0.45)',
              borderLeft: '2px solid rgba(242, 244, 255, 0.45)',
            }}
          />
          {/* Bottom-right bracket */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '18px',
              height: '18px',
              borderBottom: '2px solid rgba(242, 244, 255, 0.45)',
              borderRight: '2px solid rgba(242, 244, 255, 0.45)',
            }}
          />
        </div>

        {/* Three.js Canvas Container */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            zIndex: 1,
          }}
        />

        {/* State label & hint line under the sphere */}
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            zIndex: 5,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.74rem',
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: state === 'THINKING' || state === 'SPEAKING' ? 'var(--space-gold)' : 'var(--space-star)',
              background: 'var(--space-navy-90)',
              border: `1px solid ${state === 'THINKING' || state === 'SPEAKING' ? 'var(--space-gold)' : 'var(--space-blue-70)'}`,
              padding: '3px 12px',
              borderRadius: '4px',
              boxShadow: state === 'THINKING' || state === 'SPEAKING' ? '0 0 12px var(--space-gold-glow)' : '0 0 12px var(--space-blue-25)',
            }}
          >
            {state}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--space-star-70)',
              letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            {hintText}
          </div>
        </div>
      </div>
    );
  }
);

export const SphereView = forwardRef<SphereViewHandle, SphereViewProps>((props, ref) => (
  <SphereErrorBoundary>
    <SphereInner {...props} ref={ref} />
  </SphereErrorBoundary>
));
