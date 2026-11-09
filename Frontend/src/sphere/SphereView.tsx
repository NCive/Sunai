import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  SphereRenderer,
  SphereState,
  DecisionType,
} from './SphereRenderer';

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

export const SphereView = forwardRef<SphereViewHandle, SphereViewProps>(
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

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }
);

SphereView.displayName = 'SphereView';
