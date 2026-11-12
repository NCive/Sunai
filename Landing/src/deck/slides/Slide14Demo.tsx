import { useState, useRef } from 'react';
import { Play, Pause, Terminal, Info, ArrowUpRight } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

interface Slide14DemoProps {
  onOpenOfflineModal: () => void;
  isOnline: boolean | null;
}

export function Slide14Demo({ onOpenOfflineModal, isOnline }: Slide14DemoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => setHasVideoError(true));
      setIsPlaying(true);
    }
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
        <div className="md:col-span-7 rounded-sm overflow-hidden deck-card border border-[#202D4D] shadow-2xl bg-[#0A1024]">
          {hasVideoError ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#0A1024] to-[#02030B]">
              <div className="w-12 h-12 rounded-full bg-[#111B35] border border-[#202D4D] flex items-center justify-center mb-3 text-[#E5C18B]">
                <Play className="w-5 h-5 ml-0.5" />
              </div>
              <h4 className="text-sm font-heading tracking-wide uppercase text-[#EAF0FF] mb-1">
                {content.demo.fallbackTitle}
              </h4>
              <p className="text-xs text-[#A1AFCE] max-w-sm mb-3">
                {content.demo.fallbackDescription}
              </p>
              <span className="text-[10px] font-mono text-[#A1AFCE] bg-[#111B35] px-2.5 py-0.5 rounded">
                Video clip mode
              </span>
            </div>
          ) : (
            <div className="relative aspect-video w-full bg-black">
              <video
                ref={videoRef}
                src={content.demo.videoSrc}
                poster="/images/og-image.svg"
                playsInline
                muted
                loop
                onError={() => setHasVideoError(true)}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause demonstration video' : 'Play demonstration video'}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/25 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full deck-card border border-[#202D4D] flex items-center justify-center text-[#E5C18B] group-hover:scale-110 transition-transform">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </div>
              </button>
            </div>
          )}

          <div className="p-2.5 border-t border-[#202D4D] bg-[#0A1024]/90 flex items-center gap-2 text-left">
            <Info className="w-3.5 h-3.5 text-[#E5C18B] flex-shrink-0" />
            <p className="text-[10px] text-[#A1AFCE] font-mono leading-tight">
              {content.demo.note}
            </p>
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
