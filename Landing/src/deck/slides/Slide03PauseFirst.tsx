import { Pause, Activity, CheckCircle2, Play } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

interface Slide03PauseFirstProps {
  buildStep?: number; // 0, 1, 2, 3
}

export function Slide03PauseFirst({ buildStep = 0 }: Slide03PauseFirstProps) {
  const stepIcons = [
    <Pause className="w-4 h-4 text-[#E5C18B]" />,
    <Activity className="w-4 h-4 text-[#477FF5]" />,
    <CheckCircle2 className="w-4 h-4 text-[#956B50]" />,
    <Play className="w-4 h-4 text-[#2FD3A5]" />,
  ];

  return (
    <SlideFrame
      id="pause-first"
      sectionLabel="03 / CORE INNOVATION"
      title={content.howItWorks.title}
      subtitle={content.howItWorks.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Step list (8 cols) */}
        <div className="md:col-span-8 space-y-2.5">
          {content.howItWorks.steps.map((step, idx) => {
            const isRevealed = idx <= buildStep;
            const isCurrent = idx === buildStep;

            return (
              <div
                key={step.number}
                className={`p-3.5 rounded-sm deck-card border transition-all duration-300 ${
                  isCurrent
                    ? 'border-[#E5C18B] bg-[#E5C18B]/10 shadow-[0_0_20px_rgba(229,193,139,0.15)] scale-[1.01]'
                    : isRevealed
                    ? 'border-[#202D4D] bg-[#0A1024]/60 opacity-90'
                    : 'border-[#202D4D]/50 bg-[#02030B]/40 opacity-40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded bg-[#050817] border border-[#202D4D]">
                    {stepIcons[idx]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#E5C18B] font-bold">
                          {step.number}
                        </span>
                        <h3 className="text-xs sm:text-sm font-heading font-normal tracking-wider text-[#EAF0FF] uppercase">
                          {step.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#050817] border border-[#202D4D] text-[#EAF0FF]">
                        {step.state}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1AFCE] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic State Ring Visual (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-sm deck-card border border-[#202D4D] flex flex-col items-center justify-center text-center bg-[#0A1024]/80">
          <div className="relative w-36 h-36 flex items-center justify-center mb-3">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(32, 45, 77, 0.6)" strokeWidth="3" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={
                  buildStep === 0
                    ? '#E5C18B'
                    : buildStep === 1
                    ? '#477FF5'
                    : buildStep === 2
                    ? '#956B50'
                    : '#2FD3A5'
                }
                strokeWidth="4"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (263.89 * ((buildStep + 1) / 4))}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-4 rounded-full flex flex-col items-center justify-center bg-[#050817] border border-[#202D4D]">
              <span className="text-xs font-mono font-bold text-[#E5C18B] tracking-wider">
                {content.howItWorks.steps[buildStep].state}
              </span>
              <span className="text-[10px] font-mono text-[#A1AFCE] mt-0.5">
                STEP {buildStep + 1} OF 4
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#647394] uppercase">
            Active Phase
          </span>
          <p className="text-xs font-heading tracking-wider uppercase text-[#EAF0FF] mt-0.5">
            {content.howItWorks.steps[buildStep].title}
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}
