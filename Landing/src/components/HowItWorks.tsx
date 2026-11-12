import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Activity, CheckCircle2 } from 'lucide-react';
import { content } from '../content';

interface HowItWorksProps {
  reducedMotion: boolean;
}

export function HowItWorks({ reducedMotion }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Auto step cycler if not reduced motion
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % content.howItWorks.steps.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const stepIcons = [
    <Pause className="w-5 h-5 text-amber-400" />,
    <Activity className="w-5 h-5 text-accent-blue" />,
    <CheckCircle2 className="w-5 h-5 text-purple-400" />,
    <Play className="w-5 h-5 text-emerald-400" />,
  ];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.howItWorks.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.howItWorks.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.howItWorks.subtitle}
          </p>
        </div>

        {/* 4-Step Interactive Visual Sequence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16">
          
          {/* Step Selector List (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {content.howItWorks.steps.map((step, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  type="button"
                  key={step.number}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-5 rounded-2xl glass-card border transition-all text-left relative overflow-hidden ${
                    isSelected
                      ? 'border-white/25 bg-white/[0.06] shadow-xl'
                      : 'border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Progress bar on active card */}
                  {isSelected && (
                    <motion.div
                      layoutId="step-highlight"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-accent-blue"
                    />
                  )}

                  <div className="flex items-start gap-4">
                    <span className="font-mono text-sm text-zinc-300 mt-0.5">
                      {step.number}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-heading font-semibold text-white">
                          {step.title}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-accent-blue">
                          {step.state}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step Interactive Visualizer (5 cols) */}
          <div className="lg:col-span-5">
            <div className="p-8 rounded-2xl glass-card border border-white/10 flex flex-col items-center justify-center min-h-[380px] relative bg-[#0A1024]">
              <div className="relative w-56 h-56 flex items-center justify-center mb-6">
                
                {/* Thin Animated Decision Ring */}
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={
                      activeStep === 0
                        ? '#FFD166'
                        : activeStep === 1
                        ? '#2FD3A5'
                        : activeStep === 2
                        ? '#244DA8'
                        : '#2FD3A5'
                    }
                    strokeWidth="4"
                    strokeDasharray="276.46"
                    initial={{ strokeDashoffset: 276.46 }}
                    animate={{
                      strokeDashoffset: 276.46 - (276.46 * ((activeStep + 1) / 4)),
                    }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner State Sphere / Icon */}
                <div className="absolute inset-4 rounded-full flex flex-col items-center justify-center bg-black/50 border border-white/10 backdrop-blur-sm">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center text-center p-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                        {stepIcons[activeStep]}
                      </div>
                      <span className="text-xs font-mono font-bold text-white tracking-wider">
                        {content.howItWorks.steps[activeStep].state}
                      </span>
                      <span className="text-[11px] text-zinc-400 mt-1">
                        Step {activeStep + 1} of 4
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="text-center">
                <span className="text-xs font-mono text-zinc-400">
                  Active Lifecycle Event:
                </span>
                <p className="text-sm font-heading font-medium text-white mt-1">
                  {content.howItWorks.steps[activeStep].title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Outcome Cards (Green, Red, Amber) */}
        <div>
          <h3 className="text-lg font-heading font-semibold text-white mb-6 text-left">
            The Three Classification Outcomes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.howItWorks.outcomes.map((outcome, idx) => {
              const dotColor =
                outcome.color === 'green'
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : outcome.color === 'red'
                  ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                  : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]';

              const borderColor =
                outcome.color === 'green'
                  ? 'border-emerald-500/20 hover:border-emerald-500/40'
                  : outcome.color === 'red'
                  ? 'border-red-500/20 hover:border-red-500/40'
                  : 'border-amber-500/20 hover:border-amber-500/40';

              return (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl glass-card border ${borderColor} transition-all duration-300 text-left`}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className={`w-3 h-3 rounded-full ${dotColor}`} />
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                      {outcome.label}
                    </span>
                  </div>

                  <div className="text-sm font-mono text-zinc-200 bg-black/40 px-3 py-2 rounded-lg border border-white/5 mb-3">
                    {outcome.trigger}
                  </div>

                  <h4 className="text-base font-heading font-semibold text-white mb-2">
                    {outcome.behavior}
                  </h4>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {outcome.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

