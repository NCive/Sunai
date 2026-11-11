import { useState, useRef } from 'react';
import { Play, Pause, Terminal, Copy, Check, Info } from 'lucide-react';
import { content } from '../content';
import { VoiceAssistantButton } from './VoiceAssistantButton';

interface DemoSectionProps {
  isOnline: boolean | null;
  onOpenOfflineModal: () => void;
}

export function DemoSection({ isOnline, onOpenOfflineModal }: DemoSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <section id="demo" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#07080d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.demo.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.demo.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.demo.subtitle}
          </p>
        </div>

        {/* Framed Video Player / Fallback Card */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="relative rounded-3xl overflow-hidden glass-card border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black/60">
            
            {hasVideoError ? (
              /* Polished Fallback Presentation */
              <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0a0c16] to-[#06070a] relative">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-accent-blue">
                  <Play className="w-6 h-6 ml-1" />
                </div>
                <h3 className="text-lg font-heading font-semibold text-white mb-2">
                  {content.demo.fallbackTitle}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
                  {content.demo.fallbackDescription}
                </p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-400">
                  <Info className="w-3.5 h-3.5 text-accent-blue" />
                  <span>Recording preview mode</span>
                </div>
              </div>
            ) : (
              /* HTML5 Video Element */
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

                {/* Video Play/Pause Overlay Controls */}
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause demonstration video' : 'Play demonstration video'}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-full glass-card border border-white/30 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </div>
                </button>
              </div>
            )}

            {/* Video Caption Note */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#090b14] flex items-start sm:items-center gap-3 text-left">
              <Info className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                {content.demo.note}
              </p>
            </div>
          </div>
        </div>

        {/* Run It Yourself 3-Step Strip */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl glass-card border border-white/10 bg-[#090b14] text-left mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-heading font-semibold text-white">
                {content.demo.runStepsTitle}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {content.demo.runStepsSubtitle}
              </p>
            </div>
            <VoiceAssistantButton
              variant="default"
              isOnline={isOnline}
              onOfflineClick={onOpenOfflineModal}
              showStatusDot={true}
            />
          </div>

          <div className="space-y-4">
            {content.demo.steps.map((step, idx) => (
              <div key={step.step} className="p-4 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 flex items-center justify-center text-[11px] font-mono">
                      {step.step}
                    </span>
                    {step.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCommand(step.command, idx)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-white/10"
                    title="Copy command to clipboard"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-xs">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-300 bg-black/70 px-3 py-2 rounded-lg overflow-x-auto whitespace-pre border border-white/5">
                  <Terminal className="w-3 h-3 inline-block mr-1.5 text-zinc-400" />
                  {step.command}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
