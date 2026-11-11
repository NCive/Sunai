import { Languages, GitCommit, ShieldCheck, Eye, Cpu } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

interface Slide06FeaturesProps {
  buildStep?: number;
}

export function Slide06Features({ buildStep: _buildStep = 0 }: Slide06FeaturesProps) {
  const icons = [
    <Languages className="w-4 h-4 text-[#FFCB9A]" />,
    <GitCommit className="w-4 h-4 text-[#2FD3A5]" />,
    <ShieldCheck className="w-4 h-4 text-[#D9B08C]" />,
    <Eye className="w-4 h-4 text-[#D1E8E2]" />,
    <Cpu className="w-4 h-4 text-[#FFCB9A]" />,
  ];

  return (
    <SlideFrame
      id="features"
      sectionLabel="06 / CAPABILITIES"
      title={content.features.title}
      subtitle={content.features.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {content.features.items.map((item, idx) => {
          const isWide = idx === 0 || idx === 4;

          return (
            <div
              key={idx}
              className={`p-4 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between ${
                isWide ? 'md:col-span-2 lg:col-span-2' : 'col-span-1'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded bg-[#070F0D] border border-[#116466]/50 flex items-center justify-center">
                    {icons[idx % icons.length]}
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#116466]/20 border border-[#116466]/40 text-[#D1E8E2]">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-sm font-heading font-normal tracking-wide uppercase text-[#D1E8E2] mb-1">
                  {item.title}
                </h3>

                <p className="text-xs text-[#A3C8BF] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#116466]/30 flex items-center justify-between text-[10px] font-mono text-[#A3C8BF]/60">
                <span>VERIFIED FEATURE 0{idx + 1}</span>
                <span className="text-[#2FD3A5] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2FD3A5]" /> Operational
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

