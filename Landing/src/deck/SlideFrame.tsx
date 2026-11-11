import React from 'react';

interface SlideFrameProps {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SlideFrame({
  sectionLabel,
  title,
  subtitle,
  children,
  className = '',
  id,
}: SlideFrameProps) {
  return (
    <div
      id={id}
      className={`relative w-full h-[100dvh] max-h-[100dvh] flex flex-col justify-between py-16 px-4 sm:px-8 md:px-12 lg:px-16 overflow-hidden pointer-events-auto ${className}`}
      role="region"
      aria-roledescription="slide"
      aria-label={`${sectionLabel}: ${title}`}
    >
      {/* HUD Corner Brackets for Slide Content Frame */}
      <div className="hud-corner-bracket hud-corner-tl m-4 sm:m-6" />
      <div className="hud-corner-bracket hud-corner-tr m-4 sm:m-6" />
      <div className="hud-corner-bracket hud-corner-bl m-4 sm:m-6" />
      <div className="hud-corner-bracket hud-corner-br m-4 sm:m-6" />

      {/* Slide Header with Tiny Uppercase Label & Short Mint Line */}
      <div className="w-full max-w-6xl mx-auto z-10 pt-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="w-4 h-[1px] bg-[#D1E8E2]/60" />
          <span className="text-[10px] font-mono tracking-deck-wide text-[#D1E8E2]/70 uppercase">
            {sectionLabel}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-light tracking-deck-wide text-[#D1E8E2] uppercase">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#A3C8BF] mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Slide Main Body Content */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center my-auto z-10 overflow-hidden py-2">
        {children}
      </div>

      {/* Slide Bottom Spacer to balance framing */}
      <div className="h-6 flex-shrink-0" />
    </div>
  );
}

