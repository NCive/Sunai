import { ArrowUpRight, Eye } from 'lucide-react';
import { content } from '../content';
import { VoiceAssistantButton } from './VoiceAssistantButton';

interface FooterProps {
  isOnline: boolean | null;
  onOpenOfflineModal: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

export function Footer({
  isOnline,
  onOpenOfflineModal,
  reducedMotion,
  onToggleReducedMotion,
}: FooterProps) {
  return (
    <footer className="py-16 border-t border-white/10 bg-[#040508] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Block */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-white/10">
          
          <div className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
              </span>
              <span className="font-heading font-bold text-lg text-white tracking-wider">
                {content.hero.brand}
              </span>
            </div>
            <p className="text-sm font-heading font-medium text-zinc-300">
              {content.footer.motto}
            </p>
            <p className="text-xs text-zinc-400 font-mono">
              {content.footer.copyright}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <VoiceAssistantButton
              variant="footer"
              isOnline={isOnline}
              onOfflineClick={onOpenOfflineModal}
              showStatusDot={true}
            />

            <a
              href={content.codeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full glass-card text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
            >
              <span>{content.footer.codeCta}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* Bottom Utility Bar: Accessibility & Reduced Motion */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div>
            <span>Static marketing presentation for Sunai Voice AI</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Reduce Motion Toggle */}
            <button
              type="button"
              onClick={onToggleReducedMotion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors border border-white/10"
              aria-pressed={reducedMotion}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{content.footer.reduceMotionLabel}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  reducedMotion ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}

