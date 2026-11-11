import React, { Suspense, lazy } from 'react';
import { SLIDES_REGISTRY } from './slides';
import { useDeckScroll } from './useDeckScroll';
import { SlideTransitionView } from './SlideTransitionView';
import { HUD } from './HUD';
import { OverviewModal } from './OverviewModal';
import { OfflineModal } from '../components/OfflineModal';
import { content } from '../content';

const MorphingObject = lazy(() =>
  import('./MorphingObject').then((m) => ({ default: m.MorphingObject }))
);

interface DeckStageProps {
  isOnline: boolean | null;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export function DeckStage({
  isOnline,
  reducedMotion,
  onToggleReducedMotion,
}: DeckStageProps) {
  const {
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
    handleFpsSample,
    isReady,
    jumpToSlide,
    nextStepOrSlide,
    prevStepOrSlide,
    getSlideMetrics,
  } = useDeckScroll(reducedMotion);

  const [offlineModalOpen, setOfflineModalOpen] = React.useState(false);

  const handleOpenAnyway = () => {
    setOfflineModalOpen(false);
    window.location.href = content.assistantUrl;
  };

  const { totalHeight } = getSlideMetrics();

  // If user requests reduced motion, render the stacked document layout
  if (reducedMotion) {
    return (
      <div className="relative w-full min-h-screen bg-[#070F0D] text-[#D1E8E2] pb-24">
        {/* Simple Top Bar */}
        <header className="sticky top-0 left-0 right-0 z-50 py-3 px-6 bg-[#070F0D]/90 border-b border-[#116466]/40 flex items-center justify-between">
          <span className="font-heading font-light tracking-deck-wide text-sm uppercase text-[#D1E8E2]">
            {content.hero.brand}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={content.assistantUrl}
              onClick={(e) => {
                if (isOnline === false) {
                  e.preventDefault();
                  setOfflineModalOpen(true);
                }
              }}
              className="px-3 py-1.5 text-xs font-mono uppercase bg-[#FFCB9A] text-[#070F0D] font-bold rounded-sm"
            >
              Voice Assistant
            </a>
            <button
              type="button"
              onClick={onToggleReducedMotion}
              className="p-1.5 text-xs font-mono text-[#A3C8BF] border border-[#116466] rounded"
            >
              Enable Motion
            </button>
          </div>
        </header>

        {/* Offline Popover */}
        <OfflineModal
          isOpen={offlineModalOpen}
          onClose={() => setOfflineModalOpen(false)}
          onOpenAnyway={handleOpenAnyway}
        />

        {/* Stacked Slides */}
        <main id="main-deck" className="space-y-16">
          {SLIDES_REGISTRY.map((slide) => (
            <div
              key={slide.id}
              className="min-h-[100dvh] flex items-center justify-center border-b border-[#116466]/20"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '100dvh' }}
            >
              {slide.render({
                buildStep: slide.buildSteps > 0 ? slide.buildSteps - 1 : 0,
                onOpenOfflineModal: () => setOfflineModalOpen(true),
                isOnline,
                hasScrolled: true,
              })}
            </div>
          ))}
        </main>
      </div>
    );
  }

  // Normal Scroll-Driven Presentation Deck
  return (
    <div
      className="relative w-full bg-[#070F0D] text-[#D1E8E2]"
      style={{
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      {/* 1. Offline Popover Dialog */}
      <OfflineModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        onOpenAnyway={handleOpenAnyway}
      />

      {/* 2. Overview Slide Sorter Modal */}
      <OverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        currentSlideIndex={activeSlideIndex}
        onSelectSlide={jumpToSlide}
      />

      {/* 3. Global HUD (Top Bar, Rail, Counter, Controls) */}
      <HUD
        currentSlideIndex={activeSlideIndex}
        progress={progress}
        isOnline={isOnline}
        onOpenOfflineModal={() => setOfflineModalOpen(true)}
        onToggleOverview={() => setIsOverviewOpen((prev) => !prev)}
        onPrevSlide={prevStepOrSlide}
        onNextSlide={nextStepOrSlide}
        onJumpToSlide={jumpToSlide}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isAutoplay={isAutoplay}
        autoplaySecondsLeft={autoplaySecondsLeft}
        onToggleAutoplay={() => setIsAutoplay((prev) => !prev)}
        isLowPower={isLowPower}
        onToggleLowPower={() => setIsLowPower((prev) => !prev)}
        isReducedMotion={reducedMotion}
        onToggleReducedMotion={onToggleReducedMotion}
      />

      {/* 4. Fixed Viewport Master Stage (100dvh with hardware layer separation) */}
      <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden pointer-events-none z-10 gpu-layer">
        {/* Morphing 3D WebGL Canvas */}
        <Suspense fallback={null}>
          <MorphingObject
            pose={currentPose}
            lowPower={isLowPower}
            reducedMotion={reducedMotion}
            isScrollingOrTransitioning={transitionState.isTransitioning}
            onFpsSample={handleFpsSample}
          />
        </Suspense>

        {/* Slide Content Render Stage */}
        <main id="main-deck" className="relative w-full h-full pointer-events-auto gpu-layer">
          <SlideTransitionView
            transitionState={transitionState}
            activeSlideIndex={activeSlideIndex}
            currentBuildStep={currentBuildStep}
            isOnline={isOnline}
            onOpenOfflineModal={() => setOfflineModalOpen(true)}
            hasScrolled={hasScrolled}
            isLowPower={isLowPower}
          />
        </main>
      </div>

      {/* 5. Scroll Height Spacer */}
      <div
        ref={spacerRef}
        style={{ height: `${Math.max(totalHeight, window.innerHeight * 16)}px` }}
        className="w-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
