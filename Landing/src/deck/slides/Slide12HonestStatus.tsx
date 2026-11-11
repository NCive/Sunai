import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide12HonestStatus() {
  return (
    <SlideFrame
      id="status"
      sectionLabel="12 / TRANSPARENCY"
      title={content.honestStatus.title}
      subtitle={content.honestStatus.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {content.honestStatus.cards.map((card, idx) => {
          const isGreen = card.statusDot === 'green';

          return (
            <div
              key={idx}
              className="p-4 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isGreen
                        ? 'bg-[#2FD3A5] shadow-[0_0_10px_rgba(47,211,165,0.8)]'
                        : 'bg-[#FFCB9A] shadow-[0_0_10px_rgba(255,203,154,0.8)]'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-[#A3C8BF] uppercase tracking-wider">
                    {isGreen ? 'Verified Core' : 'Ongoing Tuning'}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-heading font-medium tracking-wide uppercase text-[#D1E8E2] mb-1.5">
                  {card.title}
                </h4>

                <p className="text-xs text-[#A3C8BF] leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-[#116466]/30 text-[10px] font-mono text-[#A3C8BF]/60">
                OBSERVATION 0{idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

