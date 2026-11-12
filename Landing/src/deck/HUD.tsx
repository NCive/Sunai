import { ArrowUpRight, Grid, ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, Zap, Eye, EyeOff } from 'lucide-react';
import { content } from '../content';
import { SLIDES_REGISTRY } from './slides';

interface HUDProps {
  currentSlideIndex: number;
  progress: number; // 0 to 1
  isOnline: boolean | null;
  onOpenOfflineModal: () => void;
  onToggleOverview: () => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onJumpToSlide: (index: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAutoplay: boolean;
  autoplaySecondsLeft: number;
  onToggleAutoplay: () => void;
  isLowPower: boolean;
  onToggleLowPower: () => void;
  isReducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export function HUD({
  currentSlideIndex,
  progress,
  isOnline,
  onOpenOfflineModal,
  onToggleOverview,
  onPrevSlide,
  onNextSlide,
  onJumpToSlide,
  isFullscreen,
  onToggleFullscreen,
  isAutoplay,
  autoplaySecondsLeft,
  onToggleAutoplay,
  isLowPower,
  onToggleLowPower,
  isReducedMotion,
  onToggleReducedMotion,
}: HUDProps) {
  const currentSlide = SLIDES_REGISTRY[currentSlideIndex] || SLIDES_REGISTRY[0];

  const handleAssistantClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isOnline === false) {
      e.preventDefault();
      onOpenOfflineModal();
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      {/* 1. Top Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] bg-black/40 z-50 pointer-events-none"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Deck presentation progress"
      >
        <div
          className="h-full bg-gradient-to-r from-[#244DA8] via-[#477FF5] to-[#62C9E8] shadow-[0_0_8px_rgba(98,201,232,0.6)] transition-all duration-75 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>

      {/* 2. Top Bar */}
      <header className="fixed top-0 left-0 right-0 py-3.5 px-4 sm:px-8 lg:px-12 flex items-center justify-between z-40">
        {/* Brand Logo */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              onJumpToSlide(0);
            }}
            className="flex items-center gap-2 group text-[#EAF0FF] hover:text-[#62C9E8] transition-colors"
            aria-label="Sunai Home Slide"
          >
            <span className="w-5 h-5 rounded-full border border-[#EAF0FF]/50 flex items-center justify-center group-hover:border-[#62C9E8] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FD3A5]" />
            </span>
            <span className="font-heading font-light tracking-deck-widest text-sm uppercase">
              {content.hero.brand}
            </span>
          </a>
        </div>

        {/* Right Navigation & Assistant Action */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Status Dot */}
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono text-[#A1AFCE]"
            title={isOnline ? content.assistantStatus.labels.online : content.assistantStatus.labels.offline}
            aria-live="polite"
          >
            <span
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                isOnline
                  ? 'bg-[#2FD3A5] shadow-[0_0_8px_rgba(47,211,165,0.8)]'
                  : 'bg-zinc-500 shadow-[0_0_4px_rgba(113,113,122,0.4)]'
              }`}
            />
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Electric Blue Voice Assistant Button */}
          <a
            href={content.assistantUrl}
            onClick={handleAssistantClick}
            aria-label="Open the Sunai voice assistant"
            className="relative px-3.5 py-1.5 text-xs font-mono tracking-wider uppercase text-white bg-[#477FF5] hover:bg-[#5b8ff7] font-semibold transition-all inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(71,127,245,0.35)] rounded-sm"
          >
            <span>Voice Assistant</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          {/* Overview Grid Menu Button */}
          <button
            type="button"
            onClick={onToggleOverview}
            className="p-1.5 text-[#EAF0FF] hover:text-white deck-card rounded-sm border border-[#202D4D] bg-[#0A1024] hover:bg-[#111B35] hover:border-[#244DA8] transition-colors"
            title="Overview (Press O)"
            aria-label="Toggle Deck Overview"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. Side Progress Rail (Right Edge) */}
      <nav
        aria-label="Slide Progress Rail"
        className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center gap-2 z-40 hidden md:flex"
      >
        {SLIDES_REGISTRY.map((slide, idx) => {
          const isActive = idx === currentSlideIndex;
          return (
            <button
              type="button"
              key={slide.id}
              onClick={() => onJumpToSlide(idx)}
              className="group relative p-1 flex items-center justify-center focus:outline-none"
              aria-label={`Jump to slide ${idx + 1}: ${slide.title}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Rail Dot */}
              <span
                className={`w-1.5 transition-all duration-300 rounded-full ${
                  isActive
                    ? 'h-4 bg-[#62C9E8] shadow-[0_0_8px_rgba(98,201,232,0.8)]'
                    : 'h-1.5 bg-[#202D4D] group-hover:bg-[#EAF0FF]'
                }`}
              />

              {/* Hover Tooltip */}
              <span className="absolute right-6 px-2 py-1 rounded bg-[#0A1024] border border-[#202D4D] text-[10px] font-mono text-[#EAF0FF] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg">
                0{idx + 1} &bull; {slide.title}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 4. Bottom-Left Slide Indicator */}
      <div className="fixed bottom-4 left-4 sm:left-8 lg:left-12 pointer-events-auto flex items-center gap-3 z-40">
        <div className="px-3 py-1.5 rounded-sm deck-card border border-[#202D4D] bg-[#0A1024]/90 text-xs font-mono text-[#EAF0FF] flex items-center gap-2.5">
          <span className="text-[#62C9E8] font-bold">
            {currentSlideIndex + 1 < 10 ? `0${currentSlideIndex + 1}` : currentSlideIndex + 1}
          </span>
          <span className="text-[#647394]">/</span>
          <span className="text-[#A1AFCE]">
            {SLIDES_REGISTRY.length < 10 ? `0${SLIDES_REGISTRY.length}` : SLIDES_REGISTRY.length}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#244DA8]" />
          <span className="text-[11px] uppercase tracking-wider text-[#A1AFCE] max-w-[200px] truncate hidden sm:inline">
            {currentSlide.title}
          </span>
        </div>
      </div>

      {/* 5. Bottom-Right Controls Cluster */}
      <div className="fixed bottom-4 right-4 sm:right-8 lg:right-12 pointer-events-auto flex items-center gap-1.5 z-40 bg-[#0A1024]/90 p-1 rounded-sm deck-card border border-[#202D4D]">
        {/* Previous Slide */}
        <button
          type="button"
          onClick={onPrevSlide}
          disabled={currentSlideIndex === 0}
          className="p-1.5 text-[#A1AFCE] hover:text-[#EAF0FF] disabled:opacity-30 disabled:hover:text-[#A1AFCE] transition-colors"
          title="Previous slide (Left / Up arrow)"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Next Slide */}
        <button
          type="button"
          onClick={onNextSlide}
          disabled={currentSlideIndex === SLIDES_REGISTRY.length - 1}
          className="p-1.5 text-[#A1AFCE] hover:text-[#EAF0FF] disabled:opacity-30 disabled:hover:text-[#A1AFCE] transition-colors"
          title="Next slide (Right / Down arrow / Space)"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="w-[1px] h-3.5 bg-[#202D4D] mx-0.5" />

        {/* Autoplay / Present Mode Toggle */}
        <button
          type="button"
          onClick={onToggleAutoplay}
          className={`relative p-1.5 rounded-sm transition-colors ${
            isAutoplay ? 'text-white bg-[#477FF5]' : 'text-[#A1AFCE] hover:text-[#EAF0FF]'
          }`}
          title={isAutoplay ? `Autoplay Active (${autoplaySecondsLeft}s left)` : 'Start Autoplay Present Mode'}
          aria-label="Toggle Autoplay Presentation"
        >
          {isAutoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 text-[#A1AFCE] hover:text-[#EAF0FF] transition-colors"
          title="Toggle Fullscreen (F)"
          aria-label="Toggle Fullscreen Mode"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Low-Power Toggle */}
        <button
          type="button"
          onClick={onToggleLowPower}
          className={`p-1.5 transition-colors rounded-sm ${
            isLowPower ? 'text-white bg-[#477FF5]' : 'text-[#A1AFCE] hover:text-[#EAF0FF]'
          }`}
          title={isLowPower ? 'Low Power Mode Active' : 'Switch to Low Power Mode'}
          aria-label="Toggle Low Power Mode"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>

        {/* Reduce Motion Toggle */}
        <button
          type="button"
          onClick={onToggleReducedMotion}
          className={`p-1.5 transition-colors ${
            isReducedMotion ? 'text-[#FF6A5C]' : 'text-[#A1AFCE] hover:text-[#EAF0FF]'
          }`}
          title={isReducedMotion ? 'Reduced Motion Active' : 'Toggle Reduced Motion'}
          aria-label="Toggle Reduced Motion"
        >
          {isReducedMotion ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
