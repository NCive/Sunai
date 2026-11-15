import React, { useState, useEffect } from 'react';
import { Play, Terminal, ArrowUpRight } from 'lucide-react';
import { content, DEMO_VIDEO_URL } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function getDriveEmbedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    console.warn('[Slide14Demo] Invalid Google Drive URL:', url);
    return null;
  }

  // Matches https://drive.google.com/file/d/<id>/view... or /file/d/<id>
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://drive.google.com/file/d/${fileDMatch[1]}/preview`;
  }

  // Matches https://drive.google.com/open?id=<id> or ?id=<id>
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://drive.google.com/file/d/${idParamMatch[1]}/preview`;
  }

  console.warn('[Slide14Demo] Unable to parse Google Drive file ID from URL:', url);
  return null;
}

interface Slide14DemoProps {
  onOpenOfflineModal: () => void;
  isOnline: boolean | null;
  isActive?: boolean;
  onStopAutoplay?: () => void;
}

export function Slide14Demo({
  onOpenOfflineModal,
  isOnline,
  isActive = true,
  onStopAutoplay,
}: Slide14DemoProps) {
  const [showIframe, setShowIframe] = useState(false);

  // When visitor leaves slide 14 (or slide becomes inactive), remove iframe completely
  // so audio stops. When they return, placeholder is displayed again.
  useEffect(() => {
    if (!isActive) {
      setShowIframe(false);
    }
  }, [isActive]);

  const embedUrl = getDriveEmbedUrl(DEMO_VIDEO_URL);

  const handlePlayClick = () => {
    if (!embedUrl) {
      console.warn('[Slide14Demo] Cannot play video: embed URL could not be generated.');
      return;
    }
    // Stop deck autoplay if running
    onStopAutoplay?.();
    // Mount iframe
    setShowIframe(true);
  };

  const handleAssistantClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isOnline === false) {
      e.preventDefault();
      onOpenOfflineModal();
    }
  };

  return (
    <SlideFrame
      id="demo"
      sectionLabel="14 / LIVE DEMONSTRATION"
      title={content.demo.title}
      subtitle={content.demo.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Video Player Frame (7 cols) */}
        <div className="md:col-span-7 rounded-sm overflow-hidden deck-card border border-[#202D4D] shadow-2xl bg-[#0A1024] flex flex-col justify-between">
          {!showIframe ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center bg-gradient-to-b from-[#0A1024] to-[#02030B] relative">
              <button
                type="button"
                onClick={handlePlayClick}
                aria-label="Play demonstration video"
                className="w-12 h-12 rounded-full bg-[#111B35] border border-[#202D4D] flex items-center justify-center mb-3 text-[#E5C18B] hover:scale-110 hover:border-[#62C9E8] transition-all cursor-pointer shadow-lg group"
              >
                <Play className="w-5 h-5 ml-0.5 group-hover:text-[#62C9E8] transition-colors" />
              </button>
              <h4 className="text-sm font-heading tracking-wide uppercase text-[#EAF0FF] mb-1">
                {content.demo.fallbackTitle}
              </h4>
              <p className="text-xs text-[#A1AFCE] max-w-sm mb-3">
                {content.demo.fallbackDescription}
              </p>
              <span className="text-[10px] font-mono text-[#A1AFCE] bg-[#111B35] px-2.5 py-0.5 rounded border border-[#202D4D]/50">
                Video clip mode
              </span>
            </div>
          ) : (
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={embedUrl || undefined}
                title="Sunai demo video"
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full h-full border-0 absolute inset-0"
              />
            </div>
          )}

          {/* Under-player Fallback Link */}
          <div className="px-3 py-2 border-t border-[#202D4D] bg-[#0A1024]/90 flex items-center justify-between text-left">
            <span className="text-[10px] font-mono text-[#647394] uppercase tracking-wider">
              {showIframe ? 'Live Demonstration' : 'Recorded Demonstration'}
            </span>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#62C9E8] hover:text-[#A5C8FF] hover:underline transition-colors"
            >
              <span>Open video in a new tab</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 3 Run Steps (5 cols) */}
        <div className="md:col-span-5 p-4 rounded-sm deck-card border border-[#202D4D] space-y-3 bg-[#0A1024]/80">
          <div className="flex items-center justify-between pb-2 border-b border-[#202D4D]">
            <h4 className="text-xs font-heading font-medium tracking-wide uppercase text-[#EAF0FF]">
              {content.demo.runStepsTitle}
            </h4>
            <a
              href={content.assistantUrl}
              onClick={handleAssistantClick}
              className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-white bg-[#477FF5] hover:bg-[#5b8ef7] shadow-[0_0_12px_rgba(71,127,245,0.4)] px-2 py-1 font-bold rounded-sm transition-colors"
            >
              <span>Launch</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            {content.demo.steps.map((step) => (
              <div key={step.step} className="p-2 rounded bg-[#050817] border border-[#202D4D]">
                <span className="text-[10px] font-mono text-[#E5C18B] block mb-0.5">
                  STEP {step.step}: {step.title}
                </span>
                <div className="font-mono text-[9px] text-[#A1AFCE] bg-black/60 px-2 py-1 rounded overflow-x-auto whitespace-pre">
                  <Terminal className="w-2.5 h-2.5 inline mr-1 text-[#2FD3A5]" />
                  {step.command}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
