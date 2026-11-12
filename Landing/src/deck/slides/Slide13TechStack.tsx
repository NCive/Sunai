import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide13TechStack() {
  return (
    <SlideFrame
      id="tech-stack"
      sectionLabel="13 / TECHNOLOGIES"
      title={content.techStack.title}
      subtitle="Complete edge voice and intelligence stack composed with open and verified frameworks."
    >
      <div className="w-full my-auto space-y-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3">
          {content.techStack.wordmarks.map((wordmark, idx) => (
            <div
              key={idx}
              className="px-4 py-3 rounded-sm deck-card border border-[#202D4D] text-xs sm:text-sm font-mono text-[#EAF0FF] flex items-center gap-2 hover:border-[#E5C18B] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5C18B]" />
              <span>{wordmark}</span>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-sm deck-card border border-[#202D4D] max-w-xl mx-auto text-[11px] font-mono text-[#A1AFCE]">
          &bull; Zero external API dependencies at runtime &bull; Pure local &amp; streaming protocol
        </div>
      </div>
    </SlideFrame>
  );
}
