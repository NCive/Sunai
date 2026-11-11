import { ArrowUpRight } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

interface Slide16ClosingProps {
  onOpenOfflineModal: () => void;
  isOnline: boolean | null;
}

export function Slide16Closing({ onOpenOfflineModal, isOnline }: Slide16ClosingProps) {
  const handleAssistantClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isOnline === false) {
      e.preventDefault();
      onOpenOfflineModal();
    }
  };

  return (
    <SlideFrame
      id="closing"
      sectionLabel="16 / CONCLUSION"
      title="Conclusion"
      subtitle={content.footer.copyright}
    >
      <div className="w-full my-auto flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-12 h-12 rounded-full border border-[#D1E8E2]/40 flex items-center justify-center shadow-[0_0_30px_rgba(209,232,226,0.2)]">
          <span className="w-3 h-3 rounded-full bg-[#FFCB9A] animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-deck-wide text-[#FFCB9A]">
            Core Philosophy
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-heading font-light tracking-deck-wide text-[#D1E8E2] uppercase">
            {content.footer.motto}
          </h3>
          <p className="text-xs sm:text-sm text-[#A3C8BF] max-w-xl mx-auto leading-relaxed pt-1">
            Natural conversational timing through instant pause, split-second acoustic and lexical classification, and seamless resume.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={content.assistantUrl}
            onClick={handleAssistantClick}
            aria-label="Open the Sunai voice assistant"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono tracking-wider uppercase bg-[#FFCB9A] text-[#070F0D] hover:bg-[#D9B08C] font-semibold transition-all shadow-[0_0_25px_rgba(255,203,154,0.3)]"
          >
            <span>{content.footer.voiceAssistantCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          <a
            href={content.codeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-mono tracking-wider uppercase deck-card text-[#D1E8E2] hover:text-white hover:border-[#D1E8E2] transition-all"
          >
            <span>{content.footer.codeCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#FFCB9A]" />
          </a>
        </div>

        <div className="pt-6 border-t border-[#116466]/40 text-[10px] font-mono text-[#A3C8BF]/60 max-w-md">
          {content.footer.copyright}
        </div>
      </div>
    </SlideFrame>
  );
}

