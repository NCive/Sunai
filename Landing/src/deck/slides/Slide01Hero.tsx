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
          <span className="w-4 h-[1px] bg-[#A1AFCE]/60" />
          <span className="text-[10px] font-mono tracking-deck-wide text-[#A1AFCE] uppercase">
            01 / INTRODUCTION
          </span>
        </div>
      </div>

      {/* Hero Center Presentation */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center my-auto z-10 space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm deck-card border border-[#202D4D] text-[11px] font-mono text-[#E5C18B] w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2FD3A5] animate-pulse" />
          <span>{content.hero.brandMeaning}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-light tracking-deck-wide text-[#EAF0FF] uppercase leading-[1.15]">
          Most voice bots either talk over you or stop for every sound.{' '}
          <span className="text-[#E5C18B] font-normal">Sunai fixes the timing.</span>
        </h1>

        <p className="text-sm sm:text-base text-[#A1AFCE] max-w-2xl leading-relaxed">
          {content.hero.subline}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <a
            href={content.assistantUrl}
            onClick={handleAssistantClick}
            aria-label="Open the Sunai voice assistant"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono tracking-wider uppercase bg-[#477FF5] text-white hover:bg-[#5b8ef7] font-semibold transition-all shadow-[0_0_16px_rgba(71,127,245,0.4)]"
          >
            <span>{content.hero.primaryCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          <a
            href="#problem"
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-mono tracking-wider uppercase bg-transparent border border-[#202D4D] text-[#A1AFCE] hover:bg-[#111B35] hover:text-[#EAF0FF] transition-all rounded-sm"
          >
            <span>{content.hero.secondaryCta}</span>
            <ArrowDown className="w-3.5 h-3.5 text-[#A1AFCE]" />
          </a>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {content.hero.chips.map((chip, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono px-2.5 py-1 bg-[#0A1024] border border-[#202D4D] text-[#EAF0FF]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Scroll Prompt */}
      <div
        className={`w-full max-w-6xl mx-auto flex items-center justify-between text-[10px] font-mono text-[#647394] transition-opacity duration-500 ${
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
