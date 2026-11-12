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
        return '#FFD166';
      default:
        return '#EAF0FF';
    }
  };

  return (
    <SlideFrame
      id="simulation"
      sectionLabel="05 / TESTBED"
      title={content.simulation.title}
      subtitle={content.simulation.subtitle}
    >
      <div className="w-full max-w-4xl mx-auto my-auto p-5 sm:p-6 rounded-sm deck-card border border-[#202D4D] shadow-2xl bg-[#0A1024]/90">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-[#202D4D]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#EAF0FF]">
            <Sparkles className="w-3.5 h-3.5 text-[#E5C18B]" />
            <span>Interactive Decision Testbed</span>
          </div>
          <span className="text-[10px] font-mono text-[#A1AFCE] bg-[#111B35] px-2 py-0.5 rounded">
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
                    ? 'bg-[#477FF5] text-white border-[#62C9E8] font-bold shadow-[0_0_15px_rgba(71,127,245,0.4)]'
                    : 'bg-[#0A1024] border-[#202D4D] text-[#A1AFCE] hover:border-[#62C9E8] hover:text-[#EAF0FF]'
                }`}
              >
                {scenario.buttonLabel}
              </button>
            );
          })}
        </div>

        {/* Central Display */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-[#050817]/60 p-4 sm:p-5 rounded-sm border border-[#202D4D]">
          {/* Ring (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(32, 45, 77, 0.6)" strokeWidth="3" />
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
              <div className="absolute w-18 h-18 rounded-full flex flex-col items-center justify-center bg-[#050817] border border-[#202D4D]">
                <div className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: getRingColor() }} />
                <span className="text-[10px] font-mono uppercase font-bold text-[#EAF0FF]">
                  {activeScenario.color}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] font-mono text-[#A1AFCE] flex items-center gap-1">
              {isSimulating ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#E5C18B]" />
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
              <span className="text-[10px] font-mono text-[#647394] uppercase">Audio Input</span>
              <div className="text-xs font-mono text-[#EAF0FF] mt-0.5 bg-[#050817] px-2.5 py-1.5 rounded border border-[#202D4D]">
                {activeScenario.inputPhrase}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#647394] uppercase">Decision Action</span>
              <div className="text-xs sm:text-sm font-heading font-medium uppercase text-[#EAF0FF] mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRingColor() }} />
                <span>{activeScenario.action}</span>
              </div>
            </div>

            <div className="p-2 rounded bg-[#111B35] border border-[#202D4D] text-xs font-mono text-[#EAF0FF] flex items-start gap-2">
              <Volume2 className="w-3.5 h-3.5 text-[#E5C18B] flex-shrink-0 mt-0.5" />
              <span>{activeScenario.responseLine}</span>
            </div>

            <p className="text-[11px] text-[#A1AFCE] leading-relaxed pt-0.5">
              {activeScenario.explanation}
            </p>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
