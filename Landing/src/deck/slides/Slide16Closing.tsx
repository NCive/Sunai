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
        <div className="w-12 h-12 rounded-full border border-[#202D4D] flex items-center justify-center shadow-[0_0_20px_rgba(71,127,245,0.2)]">
          <span className="w-3 h-3 rounded-full bg-[#E5C18B] animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-deck-wide text-[#E5C18B]">
            Core Philosophy
          </span>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-heading font-light tracking-deck-wide text-[#EAF0FF] uppercase">
            {content.footer.motto}
          </h3>
          <p className="text-xs sm:text-sm text-[#A1AFCE] max-w-xl mx-auto leading-relaxed pt-1">
            Natural conversational timing through instant pause, split-second acoustic and lexical classification, and seamless resume.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={content.assistantUrl}
            onClick={handleAssistantClick}
            aria-label="Open the Sunai voice assistant"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono tracking-wider uppercase bg-[#477FF5] text-white hover:bg-[#5b8ef7] font-semibold transition-all shadow-[0_0_16px_rgba(71,127,245,0.4)] rounded-sm"
          >
            <span>{content.footer.voiceAssistantCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          <a
            href={content.codeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-mono tracking-wider uppercase bg-transparent border border-[#202D4D] text-[#A1AFCE] hover:bg-[#111B35] hover:text-[#EAF0FF] transition-all rounded-sm"
          >
            <span>{content.footer.codeCta}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#A1AFCE]" />
          </a>
        </div>

        <div className="pt-6 border-t border-[#202D4D] text-[10px] font-mono text-[#647394] max-w-md">
          {content.footer.copyright}
        </div>
      </div>
    </SlideFrame>
  );
}
