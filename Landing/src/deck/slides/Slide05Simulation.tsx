import { useState } from 'react';
import { Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { content, SimScenario } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide05Simulation() {
  const [activeScenario, setActiveScenario] = useState<SimScenario>(content.simulation.scenarios[0]);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = (scenario: SimScenario) => {
    setIsSimulating(true);
    setActiveScenario(scenario);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  const getRingColor = () => {
    switch (activeScenario.color) {
      case 'green':
        return '#2FD3A5';
      case 'red':
        return '#FF6A5C';
      case 'amber':
        return '#FFCB9A';
      default:
        return '#D1E8E2';
    }
  };

  return (
    <SlideFrame
      id="simulation"
      sectionLabel="05 / TESTBED"
      title={content.simulation.title}
      subtitle={content.simulation.subtitle}
    >
      <div className="w-full max-w-4xl mx-auto my-auto p-5 sm:p-6 rounded-sm deck-card border border-[#116466]/60 shadow-2xl bg-[#070F0D]/90">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-[#116466]/40">
          <div className="flex items-center gap-2 text-xs font-mono text-[#D1E8E2]">
            <Sparkles className="w-3.5 h-3.5 text-[#FFCB9A]" />
            <span>Interactive Decision Testbed</span>
          </div>
          <span className="text-[10px] font-mono text-[#A3C8BF]/60 bg-[#116466]/20 px-2 py-0.5 rounded">
            {content.simulation.disclaimer}
          </span>
        </div>

        {/* 4 Trigger Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {content.simulation.scenarios.map((scenario) => {
            const isSelected = activeScenario.id === scenario.id;
            return (
              <button
                type="button"
                key={scenario.id}
                onClick={() => runSimulation(scenario)}
                className={`px-3 py-2.5 rounded-sm text-xs font-mono transition-all text-center border ${
                  isSelected
                    ? 'bg-[#FFCB9A] text-[#070F0D] border-[#FFCB9A] font-bold shadow-[0_0_15px_rgba(255,203,154,0.3)]'
                    : 'bg-[#070F0D] border-[#116466]/50 text-[#D1E8E2] hover:border-[#D1E8E2]'
                }`}
              >
                {scenario.buttonLabel}
              </button>
            );
          })}
        </div>

        {/* Central Display */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-[#070F0D]/60 p-4 sm:p-5 rounded-sm border border-[#116466]/40">
          {/* Ring (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(17, 100, 102, 0.3)" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={getRingColor()}
                  strokeWidth="4"
                  strokeDasharray="263.89"
                  strokeDashoffset={isSimulating ? 130 : 0}
                  className="transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute w-18 h-18 rounded-full flex flex-col items-center justify-center bg-[#070F0D] border border-[#116466]/40">
                <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: getRingColor() }} />
                <span className="text-[10px] font-mono uppercase font-bold text-[#D1E8E2]">
                  {activeScenario.color}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-[#A3C8BF] flex items-center gap-1">
              {isSimulating ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#FFCB9A]" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getRingColor() }} />
                  <span>Decision reached</span>
                </>
              )}
            </div>
          </div>

          {/* Details (8 cols) */}
          <div className="md:col-span-8 space-y-2 text-left">
            <div>
              <span className="text-[10px] font-mono text-[#A3C8BF]/60 uppercase">Audio Input</span>
              <div className="text-xs font-mono text-[#D1E8E2] mt-0.5 bg-[#070F0D] px-2.5 py-1.5 rounded border border-[#116466]/40">
                {activeScenario.inputPhrase}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#A3C8BF]/60 uppercase">Decision Action</span>
              <div className="text-xs sm:text-sm font-heading font-medium uppercase text-[#D1E8E2] mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRingColor() }} />
                <span>{activeScenario.action}</span>
              </div>
            </div>

            <div className="p-2 rounded bg-[#116466]/20 border border-[#116466]/40 text-xs font-mono text-[#D1E8E2] flex items-start gap-2">
              <Volume2 className="w-3.5 h-3.5 text-[#FFCB9A] flex-shrink-0 mt-0.5" />
              <span>{activeScenario.responseLine}</span>
            </div>

            <p className="text-[11px] text-[#A3C8BF] leading-relaxed pt-0.5">
              {activeScenario.explanation}
            </p>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

