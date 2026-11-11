import { Sparkles, Database, Zap, GitBranch, Server } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide11WhyQwen() {
  const icons = [
    <Sparkles className="w-4 h-4 text-[#FFCB9A]" />,
    <Database className="w-4 h-4 text-[#2FD3A5]" />,
    <Zap className="w-4 h-4 text-[#D9B08C]" />,
    <GitBranch className="w-4 h-4 text-[#D1E8E2]" />,
    <Server className="w-4 h-4 text-[#FFCB9A]" />,
  ];

  return (
    <SlideFrame
      id="why-qwen"
      sectionLabel="11 / MODEL SELECTION"
      title={content.whyQwen.title}
      subtitle={content.whyQwen.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {content.whyQwen.points.map((point, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded bg-[#070F0D] border border-[#116466]/50 flex items-center justify-center">
                  {icons[idx % icons.length]}
                </div>
                <span className="text-[10px] font-mono text-[#A3C8BF]/60">
                  ADVANTAGE 0{idx + 1}
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-heading font-medium tracking-wide uppercase text-[#D1E8E2] mb-1">
                {point.title}
              </h4>

              <p className="text-xs text-[#A3C8BF] leading-relaxed">
                {point.description}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-[#116466]/30 text-[10px] font-mono text-[#FFCB9A]">
              &bull; Factual Architectural Rationale
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

