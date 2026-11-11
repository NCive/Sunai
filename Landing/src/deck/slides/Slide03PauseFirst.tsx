import { Pause, Activity, CheckCircle2, Play } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

interface Slide03PauseFirstProps {
  buildStep?: number; // 0, 1, 2, 3
}

export function Slide03PauseFirst({ buildStep = 0 }: Slide03PauseFirstProps) {
  const stepIcons = [
    <Pause className="w-4 h-4 text-[#FFCB9A]" />,
    <Activity className="w-4 h-4 text-[#D1E8E2]" />,
    <CheckCircle2 className="w-4 h-4 text-[#D9B08C]" />,
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
                    ? 'border-[#FFCB9A] bg-[#FFCB9A]/10 shadow-[0_0_20px_rgba(255,203,154,0.15)] scale-[1.01]'
                    : isRevealed
                    ? 'border-[#116466]/60 bg-[#0D1C19]/60 opacity-90'
                    : 'border-[#116466]/20 bg-[#070F0D]/40 opacity-40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded bg-[#070F0D] border border-[#116466]/40">
                    {stepIcons[idx]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#FFCB9A] font-bold">
                          {step.number}
                        </span>
                        <h3 className="text-xs sm:text-sm font-heading font-normal tracking-wider text-[#D1E8E2] uppercase">
                          {step.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#070F0D] border border-[#116466] text-[#D1E8E2]">
                        {step.state}
                      </span>
                    </div>
                    <p className="text-xs text-[#A3C8BF] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic State Ring Visual (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-sm deck-card border border-[#116466]/50 flex flex-col items-center justify-center text-center bg-[#070F0D]/80">
          <div className="relative w-36 h-36 flex items-center justify-center mb-3">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(17, 100, 102, 0.3)" strokeWidth="3" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={
                  buildStep === 0
                    ? '#FFCB9A'
                    : buildStep === 1
                    ? '#D1E8E2'
                    : buildStep === 2
                    ? '#D9B08C'
                    : '#2FD3A5'
                }
                strokeWidth="4"
                strokeDasharray="263.89"
                strokeDashoffset={263.89 - (263.89 * ((buildStep + 1) / 4))}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-4 rounded-full flex flex-col items-center justify-center bg-[#070F0D] border border-[#116466]/40">
              <span className="text-xs font-mono font-bold text-[#FFCB9A] tracking-wider">
                {content.howItWorks.steps[buildStep].state}
              </span>
              <span className="text-[10px] font-mono text-[#A3C8BF] mt-0.5">
                STEP {buildStep + 1} OF 4
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#A3C8BF]/70 uppercase">
            Active Phase
          </span>
          <p className="text-xs font-heading tracking-wider uppercase text-[#D1E8E2] mt-0.5">
            {content.howItWorks.steps[buildStep].title}
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}

