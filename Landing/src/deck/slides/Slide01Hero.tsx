import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { content } from '../../content';

interface Slide01HeroProps {
  onOpenOfflineModal: () => void;
  isOnline: boolean | null;
  hasScrolled?: boolean;
}

export function Slide01Hero({ onOpenOfflineModal, isOnline, hasScrolled }: Slide01HeroProps) {
  const handleAssistantClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isOnline === false) {
      e.preventDefault();
      onOpenOfflineModal();
    }
  };

  return (
    <div
      className="relative w-full h-[100dvh] flex flex-col justify-between py-16 px-4 sm:px-8 md:px-12 lg:px-16 overflow-hidden pointer-events-auto"
      role="region"
      aria-roledescription="slide"
      aria-label="01 / Title: Sunai"
    >
      {/* Corner Brackets */}
      <div className="hud-corner-bracket hud-corner-tl m-4 sm:m-6" />
      <div className="hud-corner-bracket hud-corner-tr m-4 sm:m-6" />
      <div className="hud-corner-bracket hud-corner-bl m-4 sm:m-6" />
      <div className="hud-corner-bracket hud-corner-br m-4 sm:m-6" />

      {/* Slide Top Sub-Header */}
      <div className="w-full max-w-6xl mx-auto z-10 pt-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4 h-[1px] bg-[#D1E8E2]/60" />
          <span className="text-[10px] font-mono tracking-deck-wide text-[#D1E8E2]/70 uppercase">
            01 / INTRODUCTION
          </span>
        </div>
      </div>

      {/* Hero Center Presentation */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center my-auto z-10 space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm deck-card border border-[#116466] text-[11px] font-mono text-[#FFCB9A] w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FD3A5] animate-pulse" />
          <span>{content.hero.brandMeaning}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-light tracking-deck-wide text-[#D1E8E2] uppercase leading-[1.15]">
          Most voice bots either talk over you or stop for every sound.{' '}
          <span className="text-[#FFCB9A] font-normal">Sunai fixes the timing.</span>
        </h1>

        <p className="text-sm sm:text-base text-[#A3C8BF] max-w-2xl leading-relaxed">
          {content.hero.subline}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <a
            href={content.assistantUrl}
            onClick={handleAssistantClick}
            aria-label="Open the Sunai voice assistant"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono tracking-wider uppercase bg-[#FFCB9A] text-[#070F0D] hover:bg-[#D9B08C] font-semibold transition-all shadow-[0_0_20px_rgba(255,203,154,0.3)]"
          >
            <span>{content.hero.primaryCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          <a
            href="#problem"
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-mono tracking-wider uppercase deck-card text-[#D1E8E2] hover:text-white hover:border-[#D1E8E2] transition-all"
          >
            <span>{content.hero.secondaryCta}</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#FFCB9A]" />
          </a>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {content.hero.chips.map((chip, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono px-2.5 py-1 bg-[#116466]/20 border border-[#116466]/50 text-[#D1E8E2]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Scroll Prompt */}
      <div
        className={`w-full max-w-6xl mx-auto flex items-center justify-between text-[10px] font-mono text-[#A3C8BF]/60 transition-opacity duration-500 ${
          hasScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <span>SCROLL OR USE ARROW KEYS TO NAVIGATE DECK</span>
        <span className="animate-pulse flex items-center gap-1">
          SCROLL <ArrowDown className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

