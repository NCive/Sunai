import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { content, SimScenario } from '../content';

export function DecisionRingSim() {
  const [activeScenario, setActiveScenario] = useState<SimScenario>(content.simulation.scenarios[0]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = (scenario: SimScenario) => {
    setIsSimulating(true);
    setActiveScenario(scenario);
    setTimeout(() => {
      setIsSimulating(false);
    }, 700);
  };

  const getRingColor = () => {
    switch (activeScenario.color) {
      case 'green':
        return '#2FD3A5';
      case 'red':
        return '#FF6A5C';
      case 'amber':
        return '#FFD166';
      default:
        return '#2FD3A5';
    }
  };

  const getGlowShadow = () => {
    switch (activeScenario.color) {
      case 'green':
        return 'shadow-[0_0_30px_rgba(16,185,129,0.5)]';
      case 'red':
        return 'shadow-[0_0_30px_rgba(239,68,68,0.5)]';
      case 'amber':
        return 'shadow-[0_0_30px_rgba(245,158,11,0.5)]';
      default:
        return 'shadow-[0_0_20px_rgba(56,189,248,0.3)]';
    }
  };

  return (
    <section id="simulation" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.simulation.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.simulation.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.simulation.subtitle}
          </p>
        </div>

        {/* Interactive Simulator Shell */}
        <div className="max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl glass-card border border-white/10 shadow-2xl relative overflow-hidden bg-[#0A1024]">
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Sparkles className="w-4 h-4 text-accent-blue" />
              <span>Interactive Decision Testbed</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded">
              {content.simulation.disclaimer}
            </span>
          </div>

          {/* Scenario Trigger Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {content.simulation.scenarios.map((scenario) => {
              const isSelected = activeScenario.id === scenario.id;
              return (
                <button
                  type="button"
                  key={scenario.id}
                  onClick={() => runSimulation(scenario)}
                  className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center flex flex-col items-center justify-center gap-1.5 border ${
                    isSelected
                      ? 'bg-white/10 border-white/30 text-white shadow-lg'
                      : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="font-mono text-xs">{scenario.buttonLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Central Animated Simulator Display */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-black/40 p-6 sm:p-8 rounded-2xl border border-white/10">
            
            {/* Visual Decision Ring (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG Ring with live pulse */}
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={getRingColor()}
                    strokeWidth="4"
                    strokeDasharray="263.89"
                    animate={{
                      strokeDashoffset: isSimulating ? 130 : 0,
                      scale: isSimulating ? 0.98 : 1,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner status dot */}
                <div
                  className={`absolute w-28 h-28 rounded-full flex flex-col items-center justify-center bg-[#050817] border border-white/10 transition-all duration-300 ${getGlowShadow()}`}
                >
                  <div
                    className="w-4 h-4 rounded-full mb-1 transition-colors duration-300"
                    style={{ backgroundColor: getRingColor() }}
                  />
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-white">
                    {activeScenario.color}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-accent-blue" />
                    <span>Evaluating chunk...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getRingColor() }} />
                    <span>Decision finalized</span>
                  </>
                )}
              </div>
            </div>

            {/* Explanation & Terminal Response (7 cols) */}
            <div className="md:col-span-7 space-y-4 text-left">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Audio Input
                </span>
                <div className="text-sm font-mono text-zinc-200 mt-1 bg-black/60 px-3 py-2 rounded-lg border border-white/10">
                  {activeScenario.inputPhrase}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Assistant Action
                </span>
                <div className="text-base font-heading font-semibold text-white mt-1 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getRingColor() }}
                  />
                  <span>{activeScenario.action}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Live Response
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeScenario.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs sm:text-sm font-mono text-zinc-300 flex items-start gap-2"
                  >
                    <Volume2 className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
                    <span>{activeScenario.responseLine}</span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                {activeScenario.explanation}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}

