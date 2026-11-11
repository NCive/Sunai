import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SLIDES_REGISTRY, ObjectPose, DeckTransition } from './slides';
import { content } from '../content';

gsap.registerPlugin(ScrollTrigger);

export interface TransitionState {
  isTransitioning: boolean;
  fromIndex: number;
  toIndex: number;
  progress: number; // 0 to 1
  transitionType: DeckTransition;
}

// Integrated GPU & screen size detector
function detectDefaultLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth < 768) return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        if (/intel|integrated|hd graphics|iris|uhd|apple m|qualcomm|adreno|mali/i.test(renderer)) {
          return true;
        }
      }
    }
  } catch {}
  return false;
}

export function useDeckScroll(reducedMotion: boolean) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [currentBuildStep, setCurrentBuildStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [autoplaySecondsLeft, setAutoplaySecondsLeft] = useState(content.deck.autoplayInterval || 8);
  const [isReady, setIsReady] = useState(false);

  // Auto-detect low power mode default on integrated GPUs or mobile screens
  const [isLowPower, setIsLowPower] = useState(() => detectDefaultLowPower());
  // Quality Level: 3 = High, 2 = Medium, 1 = Low
  const [qualityLevel, setQualityLevel] = useState<number>(() => (detectDefaultLowPower() ? 2 : 3));

  // Transition state between slides
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    fromIndex: 0,
    toIndex: 0,
    progress: 0,
    transitionType: 'push-up',
  });

  // Dynamic interpolated 3D object pose
  const [currentPose, setCurrentPose] = useState<ObjectPose>(SLIDES_REGISTRY[0].pose);

  // Precomputed metrics ref so scroll callbacks NEVER trigger layout recalculations
  const metricsRef = useRef<{
    offsets: number[];
    lengths: number[];
    contentLengths: number[];
    transLengths: number[];
    totalHeight: number;
    snapPoints: number[];
  }>({
    offsets: [],
    lengths: [],
    contentLengths: [],
    transLengths: [],
    totalHeight: 0,
    snapPoints: [],
  });

  // Calculate slide scroll start points in px
  const computeMetrics = useCallback(() => {
    const vh = window.innerHeight;
    const isMobile = window.innerWidth < 768;

    let cumulativePx = 0;
    const offsets: number[] = [];
    const lengths: number[] = [];
    const contentLengths: number[] = [];
    const transLengths: number[] = [];
    const snapPoints: number[] = [];

    SLIDES_REGISTRY.forEach((slide) => {
      offsets.push(cumulativePx);
      const transLength = (slide.transitionLength * vh) / 100 * (isMobile ? 0.7 : 1);
      const buildLength = (slide.buildStepLength * slide.buildSteps * vh) / 100 * (isMobile ? 0.6 : 1);
      const holdLength = (slide.hold * vh) / 100;
      const totalSlideLength = transLength + buildLength + holdLength;

      lengths.push(totalSlideLength);
      contentLengths.push(holdLength + buildLength);
      transLengths.push(transLength);
      cumulativePx += totalSlideLength;
    });

    const totalHeight = cumulativePx;

    offsets.forEach((off, i) => {
      const slide = SLIDES_REGISTRY[i];
      if (slide.buildSteps > 1) {
        const contentPx = contentLengths[i];
        for (let s = 0; s < slide.buildSteps; s++) {
          const stepOff = off + (contentPx / slide.buildSteps) * s;
          snapPoints.push(totalHeight > 0 ? stepOff / totalHeight : 0);
        }
      } else {
        snapPoints.push(totalHeight > 0 ? off / totalHeight : 0);
      }
    });

    metricsRef.current = { offsets, lengths, contentLengths, transLengths, totalHeight, snapPoints };
    return metricsRef.current;
  }, []);

  const getSlideMetrics = useCallback(() => {
    if (metricsRef.current.offsets.length === 0) {
      return computeMetrics();
    }
    return metricsRef.current;
  }, [computeMetrics]);

  // Jump to specific slide index
  const jumpToSlide = useCallback((index: number, pushToHistory = true) => {
    const targetIdx = Math.max(0, Math.min(SLIDES_REGISTRY.length - 1, index));
    const { offsets } = getSlideMetrics();
    const targetY = offsets[targetIdx] || 0;

    if (pushToHistory) {
      window.history.pushState(null, '', `#${SLIDES_REGISTRY[targetIdx].id}`);
    }

    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 0.8, immediate: false });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, [getSlideMetrics]);

  // Jump to next slide or next build step
  const nextStepOrSlide = useCallback(() => {
    const slide = SLIDES_REGISTRY[activeSlideIndex];
    if (slide && slide.buildSteps > 0 && currentBuildStep < slide.buildSteps - 1) {
      const { offsets, contentLengths } = getSlideMetrics();
      const contentPx = contentLengths[activeSlideIndex] || 100;
      const targetY = offsets[activeSlideIndex] + (contentPx / slide.buildSteps) * (currentBuildStep + 1);
      if (lenisRef.current) {
        lenisRef.current.scrollTo(targetY, { duration: 0.5 });
      }
    } else if (activeSlideIndex < SLIDES_REGISTRY.length - 1) {
      jumpToSlide(activeSlideIndex + 1);
    }
  }, [activeSlideIndex, currentBuildStep, getSlideMetrics, jumpToSlide]);

  // Jump to previous slide or previous build step
  const prevStepOrSlide = useCallback(() => {
    const slide = SLIDES_REGISTRY[activeSlideIndex];
    if (slide && slide.buildSteps > 0 && currentBuildStep > 0) {
      const { offsets, contentLengths } = getSlideMetrics();
      const contentPx = contentLengths[activeSlideIndex] || 100;
      const targetY = offsets[activeSlideIndex] + (contentPx / slide.buildSteps) * (currentBuildStep - 1);
      if (lenisRef.current) {
        lenisRef.current.scrollTo(targetY, { duration: 0.5 });
      }
    } else if (activeSlideIndex > 0) {
      jumpToSlide(activeSlideIndex - 1);
    }
  }, [activeSlideIndex, currentBuildStep, getSlideMetrics, jumpToSlide]);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  // Auto-Quality Controller based on FPS
  const lowFpsCountRef = useRef(0);
  const highFpsCountRef = useRef(0);

  const handleFpsSample = useCallback((fps: number) => {
    if (fps < 50) {
      lowFpsCountRef.current += 1;
      highFpsCountRef.current = 0;
      // If under 50 fps for 2 seconds, drop quality level
      if (lowFpsCountRef.current >= 2) {
        setQualityLevel((prev) => {
          const next = Math.max(1, prev - 1);
          if (next <= 2) setIsLowPower(true);
          return next;
        });
        lowFpsCountRef.current = 0;
      }
    } else if (fps >= 58) {
      highFpsCountRef.current += 1;
      lowFpsCountRef.current = 0;
      // Only recover quality if FPS stays above 58 for 10 consecutive seconds
      if (highFpsCountRef.current >= 10) {
        setQualityLevel((prev) => {
          const next = Math.min(3, prev + 1);
          if (next === 3) setIsLowPower(false);
          return next;
        });
        highFpsCountRef.current = 0;
      }
    } else {
      lowFpsCountRef.current = 0;
      highFpsCountRef.current = 0;
    }
  }, []);

  // Main GSAP ScrollTrigger + Lenis Setup (Strict Mode Safe)
  useEffect(() => {
    if (reducedMotion) {
      setIsReady(true);
      return;
    }

    computeMetrics();

    // 1. Initialize Lenis smooth scroll with clean duration
    const lenis = new Lenis({
      duration: 0.75,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;

    // 2. Single loop: Sync Lenis with GSAP ticker
    lenis.on('scroll', ScrollTrigger.update);
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    const { snapPoints } = metricsRef.current;

    // 3. Create ScrollTrigger with single smoothing source (scrub: true, no double smoothing lag)
    const trigger = ScrollTrigger.create({
      trigger: spacerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true, // directly follows Lenis inertia without adding artificial lag
      snap: content.deck.snap
        ? {
            snapTo: snapPoints,
            duration: { min: 0.35, max: 0.6 },
            delay: 0.18, // starts only after scrolling stops
            ease: 'power2.out',
            directional: true,
          }
        : undefined,
      onUpdate: (self) => {
        const scrollY = self.scroll();
        const currentProgress = self.progress;
        setProgress(currentProgress);

        if (scrollY > 15) {
          setHasScrolled(true);
        }

        const metrics = metricsRef.current;
        const currentOffsets = metrics.offsets;
        const currentContentLengths = metrics.contentLengths;
        const currentTransLengths = metrics.transLengths;

        // Determine current slide index from cached offsets (No DOM reads)
        let idx = 0;
        for (let i = 0; i < currentOffsets.length; i++) {
          if (scrollY >= currentOffsets[i] - 2) {
            idx = i;
          }
        }

        const currentSlide = SLIDES_REGISTRY[idx];
        const nextIdx = Math.min(SLIDES_REGISTRY.length - 1, idx + 1);
        const slideStart = currentOffsets[idx] || 0;
        const progressInSlidePx = Math.max(0, scrollY - slideStart);

        const contentPx = currentContentLengths[idx] || 100;
        const transPx = currentTransLengths[idx] || 100;

        // Determine transition state
        let effectiveTransition = currentSlide.transition;
        if (qualityLevel === 1) {
          effectiveTransition = 'fade-through'; // Auto-quality fallback to simple fade
        }

        if (idx === SLIDES_REGISTRY.length - 1 || transPx <= 0) {
          // Last slide (Closing)
          setTransitionState({
            isTransitioning: false,
            fromIndex: idx,
            toIndex: idx,
            progress: 0,
            transitionType: effectiveTransition,
          });
          setActiveSlideIndex(idx);
          setCurrentBuildStep(0);
          setCurrentPose(currentSlide.pose);
        } else if (progressInSlidePx < contentPx) {
          // Resting / Build zone of slide idx
          setTransitionState({
            isTransitioning: false,
            fromIndex: idx,
            toIndex: idx,
            progress: 0,
            transitionType: effectiveTransition,
          });
          setActiveSlideIndex(idx);

          if (currentSlide.buildSteps > 0) {
            const step = Math.min(
              currentSlide.buildSteps - 1,
              Math.floor((progressInSlidePx / Math.max(1, contentPx)) * currentSlide.buildSteps)
            );
            setCurrentBuildStep(step);
          } else {
            setCurrentBuildStep(0);
          }
          setCurrentPose(currentSlide.pose);
        } else {
          // IN TRANSITION ZONE between idx and nextIdx!
          const transRatio = Math.max(0, Math.min(1, (progressInSlidePx - contentPx) / transPx));
          setTransitionState({
            isTransitioning: true,
            fromIndex: idx,
            toIndex: nextIdx,
            progress: transRatio,
            transitionType: effectiveTransition,
          });

          const activeIdx = transRatio < 0.5 ? idx : nextIdx;
          setActiveSlideIndex(activeIdx);
          setCurrentBuildStep(currentSlide.buildSteps > 0 ? currentSlide.buildSteps - 1 : 0);

          // Interpolate 3D Object Pose in exact lockstep
          const p1 = currentSlide.pose;
          const p2 = SLIDES_REGISTRY[nextIdx].pose;
          const blend = transRatio;

          setCurrentPose({
            position: [
              p1.position[0] + (p2.position[0] - p1.position[0]) * blend,
              p1.position[1] + (p2.position[1] - p1.position[1]) * blend,
              p1.position[2] + (p2.position[2] - p1.position[2]) * blend,
            ],
            rotation: [
              p1.rotation[0] + (p2.rotation[0] - p1.rotation[0]) * blend,
              p1.rotation[1] + (p2.rotation[1] - p1.rotation[1]) * blend,
              p1.rotation[2] + (p2.rotation[2] - p1.rotation[2]) * blend,
            ],
            scale: p1.scale + (p2.scale - p1.scale) * blend,
            ringTilt: [
              p1.ringTilt[0] + (p2.ringTilt[0] - p1.ringTilt[0]) * blend,
              p1.ringTilt[1] + (p2.ringTilt[1] - p1.ringTilt[1]) * blend,
              p1.ringTilt[2] + (p2.ringTilt[2] - p1.ringTilt[2]) * blend,
            ],
            ringScale: p1.ringScale + (p2.ringScale - p1.ringScale) * blend,
            stateColor: blend > 0.5 ? p2.stateColor : p1.stateColor,
            ringColor: blend > 0.5 ? p2.ringColor : p1.ringColor,
            opacity: p1.opacity + (p2.opacity - p1.opacity) * blend,
            speed: p1.speed + (p2.speed - p1.speed) * blend,
          });
        }
      },
    });

    // Resize listener to update metrics
    const handleResize = () => {
      computeMetrics();
      trigger.refresh();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Ensure fonts and initial deep link scroll position are ready before revealing stage
    if (document.fonts) {
      document.fonts.ready.then(() => {
        const initialHash = window.location.hash.replace('#', '');
        if (initialHash) {
          const matchIdx = SLIDES_REGISTRY.findIndex((s) => s.id === initialHash);
          if (matchIdx >= 0) {
            jumpToSlide(matchIdx, false);
          }
        }
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      trigger.kill();
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion, computeMetrics, jumpToSlide, qualityLevel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          nextStepOrSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prevStepOrSlide();
          break;
        case 'Home':
          e.preventDefault();
          jumpToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          jumpToSlide(SLIDES_REGISTRY.length - 1);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          setIsOverviewOpen((prev) => !prev);
          break;
        case 'Escape':
          setIsOverviewOpen(false);
          break;
        default:
          if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key, 10) - 1;
            if (num < SLIDES_REGISTRY.length) {
              jumpToSlide(num);
            }
          } else if (e.key === '0') {
            jumpToSlide(9);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStepOrSlide, prevStepOrSlide, jumpToSlide, toggleFullscreen]);

  // Autoplay mode loop
  useEffect(() => {
    if (!isAutoplay || reducedMotion) return;

    setAutoplaySecondsLeft(content.deck.autoplayInterval || 8);

    const interval = setInterval(() => {
      setAutoplaySecondsLeft((prev) => {
        if (prev <= 1) {
          nextStepOrSlide();
          return content.deck.autoplayInterval || 8;
        }
        return prev - 1;
      });
    }, 1000);

    const pauseOnInteraction = () => {
      setAutoplaySecondsLeft(content.deck.autoplayInterval || 8);
    };

    window.addEventListener('mousemove', pauseOnInteraction, { passive: true });
    window.addEventListener('keydown', pauseOnInteraction, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', pauseOnInteraction);
      window.removeEventListener('keydown', pauseOnInteraction);
    };
  }, [isAutoplay, reducedMotion, nextStepOrSlide]);

  return {
    spacerRef,
    activeSlideIndex,
    currentBuildStep,
    transitionState,
    progress,
    currentPose,
    hasScrolled,
    isFullscreen,
    toggleFullscreen,
    isOverviewOpen,
    setIsOverviewOpen,
    isAutoplay,
    setIsAutoplay,
    autoplaySecondsLeft,
    isLowPower,
    setIsLowPower,
    qualityLevel,
    handleFpsSample,
    isReady,
    jumpToSlide,
    nextStepOrSlide,
    prevStepOrSlide,
    getSlideMetrics,
  };
}
