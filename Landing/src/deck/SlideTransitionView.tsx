import React, { useMemo } from 'react';
import { SLIDES_REGISTRY, DeckTransition } from './slides';
import { TransitionState } from './useDeckScroll';

interface SlideTransitionViewProps {
  transitionState: TransitionState;
  activeSlideIndex: number;
  currentBuildStep: number;
  isOnline: boolean | null;
  onOpenOfflineModal: () => void;
  hasScrolled: boolean;
  isLowPower: boolean;
}

export function SlideTransitionView({
  transitionState,
  activeSlideIndex,
  currentBuildStep,
  isOnline,
  onOpenOfflineModal,
  hasScrolled,
  isLowPower,
}: SlideTransitionViewProps) {
  const { isTransitioning, fromIndex, toIndex, progress: t, transitionType } = transitionState;

  // Compute transition styles once per tick if transitioning
  const { styleA, styleB, accent } = useMemo(() => {
    if (!isTransitioning || fromIndex === toIndex || t <= 0) {
      return { styleA: {}, styleB: {}, accent: null };
    }
    return getTransitionStyles(transitionType, t, isLowPower);
  }, [isTransitioning, fromIndex, toIndex, t, transitionType, isLowPower]);

  return (
    <div
      className="relative w-full h-full overflow-hidden gpu-layer"
      style={isTransitioning && transitionType === 'flip' ? { perspective: '1400px', transformStyle: 'preserve-3d' } : undefined}
    >
      {/* 
        MOUNT ALL SLIDES ONCE.
        Zero mount/unmount thrashing during scrolling.
        Only active / transitioning slides have visibility:visible.
        All other slides are visibility:hidden, inert, with pointer-events-none.
      */}
      {SLIDES_REGISTRY.map((slide, idx) => {
        let isVisible = false;
        let slideStyle: React.CSSProperties = {
          visibility: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateZ(0)',
          zIndex: 0,
          willChange: 'auto',
        };
        let buildStepToPass = 0;

        if (!isTransitioning || fromIndex === toIndex || t <= 0) {
          // Resting on active slide
          if (idx === activeSlideIndex) {
            isVisible = true;
            slideStyle = {
              visibility: 'visible',
              opacity: 1,
              pointerEvents: 'auto',
              transform: 'translateZ(0)',
              zIndex: 10,
              willChange: 'auto',
            };
            buildStepToPass = currentBuildStep;
          }
        } else {
          // Transitioning from fromIndex to toIndex
          if (idx === fromIndex) {
            isVisible = true;
            slideStyle = {
              ...styleA,
              visibility: 'visible',
              pointerEvents: t < 0.5 ? 'auto' : 'none',
              willChange: 'transform, opacity',
            };
            buildStepToPass = slide.buildSteps > 0 ? slide.buildSteps - 1 : 0;
          } else if (idx === toIndex) {
            isVisible = true;
            slideStyle = {
              ...styleB,
              visibility: 'visible',
              pointerEvents: t >= 0.5 ? 'auto' : 'none',
              willChange: 'transform, opacity',
            };
            buildStepToPass = 0;
          }
        }

        return (
          <div
            key={slide.id}
            id={`deck-slide-layer-${slide.id}`}
            className="absolute inset-0 w-full h-full gpu-layer"
            style={slideStyle}
            // @ts-expect-error inert is standard HTML attribute
            inert={!isVisible ? '' : undefined}
            aria-hidden={!isVisible}
          >
            {slide.render({
              buildStep: buildStepToPass,
              onOpenOfflineModal,
              isOnline,
              hasScrolled,
            })}
          </div>
        );
      })}

      {/* Transition Physical Accents (Light Streak / Ring Flash / Specular Sheen) */}
      {isTransitioning && accent}
    </div>
  );
}

// Compute GPU-accelerated transforms and opacities (No expensive clip-paths)
function getTransitionStyles(
  type: DeckTransition,
  t: number,
  isLowPower: boolean
): {
  styleA: React.CSSProperties;
  styleB: React.CSSProperties;
  accent: React.ReactNode;
} {
  const flashOpacity = Math.sin(t * Math.PI);

  switch (type) {
    case 'push-up': {
      return {
        styleA: {
          transform: `translate3d(0, ${-t * 100}%, 0)`,
          zIndex: 1,
        },
        styleB: {
          transform: `translate3d(0, ${(1 - t) * 100}%, 0)`,
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute left-0 right-0 pointer-events-none z-30"
            style={{
              top: `${(1 - t) * 100}%`,
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #2FD3A5, #FFCB9A, transparent)',
              boxShadow: '0 0 16px rgba(47, 211, 165, 0.7)',
              opacity: flashOpacity * 0.9,
              transform: 'translateY(-50%) translateZ(0)',
            }}
          />
        ),
      };
    }

    case 'iris': {
      // GPU-accelerated iris aperture using scale + borderRadius (Zero clip-path GPU invalidation)
      const scale = 0.55 + t * 0.45;
      const radiusPercent = Math.max(0, 50 - t * 50);

      return {
        styleA: {
          transform: `scale(${1 - t * 0.05}) translateZ(0)`,
          opacity: 1 - t * 0.35,
          zIndex: 1,
        },
        styleB: {
          transform: `scale(${scale}) translateZ(0)`,
          borderRadius: `${radiusPercent}%`,
          opacity: Math.min(1, t * 1.5),
          overflow: 'hidden',
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-30"
            style={{
              width: `${t * 200}vmax`,
              height: `${t * 200}vmax`,
              border: '2px solid rgba(47, 211, 165, 0.85)',
              boxShadow: '0 0 25px rgba(47, 211, 165, 0.5)',
              opacity: flashOpacity * 0.8,
              transform: 'translate(-50%, -50%) translateZ(0)',
            }}
          />
        ),
      };
    }

    case 'wipe-diagonal': {
      // Smooth diagonal GPU translate + fade
      return {
        styleA: {
          opacity: 1 - t * 0.2,
          transform: `translate3d(${-t * 20}%, ${-t * 20}%, 0)`,
          zIndex: 1,
        },
        styleB: {
          transform: `translate3d(${(1 - t) * 50}%, ${(1 - t) * 50}%, 0)`,
          opacity: t,
          overflow: 'hidden',
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute pointer-events-none z-30"
            style={{
              width: '250vw',
              height: '3px',
              top: '0',
              left: '0',
              transformOrigin: 'top left',
              transform: `translate(${t * 160 - 40}vw, 0) rotate(45deg) translateZ(0)`,
              background: 'linear-gradient(90deg, transparent, #FFCB9A, #2FD3A5, transparent)',
              boxShadow: '0 0 20px rgba(255, 203, 154, 0.8)',
              opacity: flashOpacity * 0.85,
            }}
          />
        ),
      };
    }

    case 'flip': {
      return {
        styleA: {
          transform: `rotateY(${-t * 90}deg) translateZ(0)`,
          transformOrigin: 'right center',
          backfaceVisibility: 'hidden',
          opacity: t < 0.55 ? 1 : 0,
          zIndex: t < 0.5 ? 2 : 1,
        },
        styleB: {
          transform: `rotateY(${(1 - t) * 90}deg) translateZ(0)`,
          transformOrigin: 'left center',
          backfaceVisibility: 'hidden',
          opacity: t > 0.45 ? 1 : 0,
          zIndex: t >= 0.5 ? 2 : 1,
        },
        accent: (
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: `linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, ${flashOpacity * 0.25}) 50%, transparent 65%)`,
            }}
          />
        ),
      };
    }

    case 'zoom': {
      return {
        styleA: {
          transform: `scale(${1 + t * 0.85}) translateZ(0)`,
          opacity: Math.max(0, 1 - t * 1.1),
          zIndex: 1,
        },
        styleB: {
          transform: `scale(${0.68 + t * 0.32}) translateZ(0)`,
          opacity: t,
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: `radial-gradient(circle at center, rgba(47, 211, 165, ${flashOpacity * 0.3}) 0%, transparent 70%)`,
            }}
          />
        ),
      };
    }

    case 'push': {
      return {
        styleA: {
          transform: `translate3d(${-t * 100}%, 0, 0)`,
          zIndex: 1,
        },
        styleB: {
          transform: `translate3d(${(1 - t) * 100}%, 0, 0)`,
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{
              left: `${(1 - t) * 100}%`,
              width: '3px',
              background: 'linear-gradient(180deg, transparent, #D1E8E2, #116466, transparent)',
              boxShadow: '0 0 16px rgba(209, 232, 226, 0.7)',
              opacity: flashOpacity * 0.85,
              transform: 'translateX(-50%) translateZ(0)',
            }}
          />
        ),
      };
    }

    case 'fade-through': {
      return {
        styleA: {
          opacity: Math.max(0, 1 - t * 2.1),
          transform: `scale(${1 - t * 0.04}) translateZ(0)`,
          zIndex: 1,
        },
        styleB: {
          opacity: Math.max(0, (t - 0.48) * 2.1),
          transform: `scale(${0.96 + t * 0.04}) translateZ(0)`,
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute inset-0 pointer-events-none z-30 bg-[#070F0D]"
            style={{
              opacity: (1 - Math.abs(t - 0.5) * 2) * 0.85,
            }}
          />
        ),
      };
    }

    case 'wipe-down': {
      return {
        styleA: {
          opacity: 1 - t * 0.2,
          zIndex: 1,
        },
        styleB: {
          transform: `translate3d(0, ${(1 - t) * -100}%, 0)`,
          opacity: 1,
          overflow: 'hidden',
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute left-0 right-0 pointer-events-none z-30"
            style={{
              top: `${t * 100}%`,
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #FFCB9A, #2FD3A5, transparent)',
              boxShadow: '0 0 16px rgba(255, 203, 154, 0.75)',
              opacity: flashOpacity * 0.9,
              transform: 'translateY(-50%) translateZ(0)',
            }}
          />
        ),
      };
    }

    case 'split-horizontal': {
      // GPU scaleY reveal from center (Zero clip-path overhead)
      return {
        styleA: {
          opacity: 1 - t * 0.4,
          transform: `scale(${1 - t * 0.03}) translateZ(0)`,
          zIndex: 1,
        },
        styleB: {
          transform: `scaleY(${Math.max(0.001, t)}) translateZ(0)`,
          transformOrigin: 'center center',
          opacity: Math.min(1, t * 1.5),
          overflow: 'hidden',
          zIndex: 2,
        },
        accent: (
          <>
            <div
              className="absolute left-0 right-0 pointer-events-none z-30"
              style={{
                top: `${(1 - t) * 50}%`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #2FD3A5, transparent)',
                boxShadow: '0 0 12px rgba(47, 211, 165, 0.7)',
                opacity: flashOpacity * 0.8,
              }}
            />
            <div
              className="absolute left-0 right-0 pointer-events-none z-30"
              style={{
                bottom: `${(1 - t) * 50}%`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #FFCB9A, transparent)',
                boxShadow: '0 0 12px rgba(255, 203, 154, 0.7)',
                opacity: flashOpacity * 0.8,
              }}
            />
          </>
        ),
      };
    }

    case 'blur-dissolve': {
      return {
        styleA: {
          opacity: Math.max(0, 1 - t),
          filter: isLowPower ? 'none' : `blur(${t * 6}px)`,
          zIndex: 1,
        },
        styleB: {
          opacity: Math.min(1, t),
          filter: isLowPower ? 'none' : `blur(${(1 - t) * 6}px)`,
          zIndex: 2,
        },
        accent: null,
      };
    }

    case 'zoom-out': {
      return {
        styleA: {
          transform: `scale(${1 - t * 0.35}) translateZ(0)`,
          opacity: Math.max(0, 1 - t * 1.1),
          zIndex: 1,
        },
        styleB: {
          transform: `scale(${1.35 - t * 0.35}) translateZ(0)`,
          opacity: t,
          zIndex: 2,
        },
        accent: (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-30"
            style={{
              width: `${(1 - t * 0.5) * 100}vmax`,
              height: `${(1 - t * 0.5) * 100}vmax`,
              border: '2px solid rgba(255, 203, 154, 0.6)',
              boxShadow: '0 0 20px rgba(255, 203, 154, 0.35)',
              opacity: flashOpacity * 0.7,
              transform: 'translate(-50%, -50%) translateZ(0)',
            }}
          />
        ),
      };
    }

    default:
      return {
        styleA: { opacity: 1 - t, zIndex: 1 },
        styleB: { opacity: t, zIndex: 2 },
        accent: null,
      };
  }
}
