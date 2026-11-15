import { AlertTriangle, PauseCircle, VolumeX, Volume2 } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide02Problem() {
  return (
    <SlideFrame
      id="problem"
      sectionLabel="02 / THE TIMING PROBLEM"
      title={content.problem.title}
      subtitle={content.problem.description}
      className="slide2-frame"
    >
      <div className="w-full my-auto space-y-2.5 sm:space-y-3.5 max-h-full overflow-y-auto lg:overflow-y-visible pr-1 sm:pr-0 slide2-container">
        {/* 3 Comparison Cards in Deck Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-3.5">
          {content.problem.lanes.map((lane, idx) => (
            <div
              key={idx}
              className={`p-2.5 sm:p-3 lg:p-4 rounded-sm deck-card border flex flex-col justify-between relative z-10 bg-[#0A1024]/95 backdrop-blur-sm slide2-card ${
                lane.bad
                  ? 'border-[#FF6A5C]/30 bg-[#FF6A5C]/5'
                  : 'border-[#2FD3A5]/40 bg-[#2FD3A5]/5 shadow-[0_0_20px_rgba(47,211,165,0.08)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 uppercase ${
                      lane.bad
                        ? 'bg-[#FF6A5C]/20 text-[#FF6A5C] border border-[#FF6A5C]/30'
                        : 'bg-[#2FD3A5]/20 text-[#2FD3A5] border border-[#2FD3A5]/30'
                    }`}
                  >
                    {lane.bad ? 'Flawed Timing' : 'Sunai Solution'}
                  </span>
                  {lane.bad ? (
                    <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#FF6A5C]" />
                  ) : (
                    <PauseCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#2FD3A5]" />
                  )}
                </div>

                <h3 className="text-xs sm:text-sm font-heading font-normal tracking-wide sm:tracking-wider text-[#EAF0FF] uppercase mb-1 sm:mb-2 slide2-card-title">
                  {lane.title}
                </h3>

                <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs">
                  <div className="p-1.5 sm:p-2 rounded bg-[#0A1024]/60 border border-[#202D4D] slide2-card-box">
                    <span className="text-[#647394] text-[9px] sm:text-[10px] block font-mono">USER ACTION</span>
                    <span className="text-[#EAF0FF]">{lane.userAction}</span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded bg-[#0A1024]/60 border border-[#202D4D] slide2-card-box">
                    <span className="text-[#647394] text-[9px] sm:text-[10px] block font-mono">BOT RESPONSE</span>
                    <span className={lane.bad ? 'text-[#FF6A5C]' : 'text-[#2FD3A5]'}>
                      {lane.botAction}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-[#202D4D] text-[10px] sm:text-[11px] font-mono text-[#A1AFCE]">
                Result: <span className="text-[#E5C18B]">{lane.result}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Audio Timeline Lanes Visualizer */}
        <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-sm deck-card border border-[#202D4D] bg-[#0A1024]/90 relative z-10 slide2-timeline">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2 text-[11px] sm:text-xs font-mono">
            <span className="text-[#EAF0FF] font-heading tracking-wide sm:tracking-wider uppercase">
              Conversational Audio Timeline Lanes
            </span>
            <span className="text-[9px] sm:text-[10px] text-[#A1AFCE] bg-[#111B35] px-1.5 sm:px-2 py-0.5 rounded">
              {content.problem.caption}
            </span>
          </div>

          <div className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-[10px] sm:text-[11px] font-mono">
            {/* Lane 1 */}
            <div className="grid grid-cols-12 gap-1 sm:gap-1.5 h-6 sm:h-7 items-center bg-[#050817]/90 p-0.5 sm:p-1 rounded border border-[#FF6A5C]/20 slide2-lane">
              <div className="col-span-10 bg-[#FF6A5C]/20 text-[#FF6A5C] px-1.5 sm:px-2 h-full rounded flex items-center justify-between text-[9px] sm:text-[10px]">
                <span className="truncate">Traditional Bot speaks continuous monologue...</span>
                <span className="flex items-center gap-1 shrink-0"><VolumeX className="w-3 h-3" /> Audio Collided</span>
              </div>
              <div className="col-span-2 text-[#647394] text-center text-[9px] sm:text-[10px]">Monologue</div>
            </div>

            {/* Lane 2 */}
            <div className="grid grid-cols-12 gap-1 sm:gap-1.5 h-6 sm:h-7 items-center bg-[#050817]/90 p-0.5 sm:p-1 rounded border border-[#FFD166]/20 slide2-lane">
              <div className="col-span-4 bg-[#02030B] text-[#EAF0FF] px-1.5 sm:px-2 h-full rounded flex items-center text-[9px] sm:text-[10px] truncate">
                Speaking...
              </div>
              <div className="col-span-2 bg-[#FFD166]/20 text-[#FFD166] px-1 h-full rounded flex items-center justify-center text-[9px] sm:text-[10px] truncate">
                Cough detected
              </div>
              <div className="col-span-6 border border-dashed border-[#FF6A5C]/30 text-[#FF6A5C] px-1.5 sm:px-2 h-full rounded flex items-center text-[9px] sm:text-[10px] truncate">
                Abrupt stop &amp; context wiped
              </div>
            </div>

            {/* Lane 3: Sunai */}
            <div className="grid grid-cols-12 gap-1 sm:gap-1.5 h-6 sm:h-7 lg:h-8 items-center bg-[#050817]/90 p-0.5 sm:p-1 rounded border border-[#2FD3A5]/40 shadow-[0_0_15px_rgba(47,211,165,0.1)] slide2-lane">
              <div className="col-span-3 bg-[#244DA8]/50 text-[#EAF0FF] px-1.5 sm:px-2 h-full rounded flex items-center text-[9px] sm:text-[10px] truncate">
                Speaking sentence 1...
              </div>
              <div className="col-span-2 bg-[#FFD166]/30 border border-[#FFD166] text-[#FFD166] px-1 h-full rounded flex items-center justify-center text-[9px] sm:text-[10px] animate-pulse truncate">
                Sound &#8594; Paused
              </div>
              <div className="col-span-2 bg-[#2FD3A5]/20 border border-[#2FD3A5]/40 text-[#2FD3A5] px-1 h-full rounded flex items-center justify-center text-[9px] sm:text-[10px] truncate">
                Classified: Noise
              </div>
              <div className="col-span-5 bg-[#2FD3A5]/30 text-[#EAF0FF] px-1.5 sm:px-2 h-full rounded flex items-center justify-between text-[9px] sm:text-[10px]">
                <span className="truncate">Resumes sentence smoothly</span>
                <span className="flex items-center gap-1 text-[#2FD3A5] shrink-0"><Volume2 className="w-3 h-3" /> Seamless</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
