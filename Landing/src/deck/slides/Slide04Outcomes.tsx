import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

interface Slide04OutcomesProps {
  buildStep?: number; // 0, 1, 2
}

export function Slide04Outcomes({ buildStep = 2 }: Slide04OutcomesProps) {
  return (
    <SlideFrame
      id="outcomes"
      sectionLabel="04 / CLASSIFICATION DECISIONS"
      title="The Three Classification Outcomes"
      subtitle="Sunai classifies incoming acoustic energy and lexical tokens into three distinct decisions."
    >
      <div className="w-full my-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {content.howItWorks.outcomes.map((outcome, idx) => {
          const isRevealed = idx <= buildStep;
          const isCurrent = idx === buildStep;

          const dotColor =
            outcome.color === 'green'
              ? 'bg-[#2FD3A5] shadow-[0_0_15px_rgba(47,211,165,0.8)]'
              : outcome.color === 'red'
              ? 'bg-[#FF6A5C] shadow-[0_0_15px_rgba(255,106,92,0.8)]'
              : 'bg-[#FFD166] shadow-[0_0_15px_rgba(255,209,102,0.8)]';

          const borderColor =
            outcome.color === 'green'
              ? 'border-[#2FD3A5]/40 hover:border-[#2FD3A5]'
              : outcome.color === 'red'
              ? 'border-[#FF6A5C]/40 hover:border-[#FF6A5C]'
              : 'border-[#FFD166]/40 hover:border-[#FFD166]';

          return (
            <div
              key={idx}
              className={`p-5 rounded-sm deck-card border ${borderColor} transition-all duration-300 flex flex-col justify-between ${
                isCurrent
                  ? 'scale-[1.02] shadow-2xl bg-[#0A1024]/90'
                  : isRevealed
                  ? 'opacity-100'
                  : 'opacity-30'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${dotColor}`} />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#EAF0FF]">
                    {outcome.label}
                  </span>
                </div>

                <div className="text-xs font-mono text-[#EAF0FF] bg-[#050817] px-3 py-2 rounded border border-[#202D4D] mb-3">
                  {outcome.trigger}
                </div>

                <h3 className="text-base font-heading font-medium tracking-wide uppercase text-[#EAF0FF] mb-2">
                  {outcome.behavior}
                </h3>

                <p className="text-xs text-[#A1AFCE] leading-relaxed">
                  {outcome.explanation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#202D4D] flex items-center justify-between text-[10px] font-mono text-[#647394]">
                <span>DECISION 0{idx + 1}</span>
                <span className="text-[#E5C18B] uppercase">{outcome.color} STATE</span>
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}
