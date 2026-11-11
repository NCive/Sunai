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
    >
      <div className="w-full space-y-4 my-auto">
        {/* 3 Comparison Cards in Deck Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {content.problem.lanes.map((lane, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-sm deck-card border flex flex-col justify-between ${
                lane.bad
                  ? 'border-[#FF6A5C]/30 bg-[#FF6A5C]/5'
                  : 'border-[#2FD3A5]/40 bg-[#2FD3A5]/5 shadow-[0_0_20px_rgba(47,211,165,0.08)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 uppercase ${
                      lane.bad
                        ? 'bg-[#FF6A5C]/20 text-[#FF6A5C] border border-[#FF6A5C]/30'
                        : 'bg-[#2FD3A5]/20 text-[#2FD3A5] border border-[#2FD3A5]/30'
                    }`}
                  >
                    {lane.bad ? 'Flawed Timing' : 'Sunai Solution'}
                  </span>
                  {lane.bad ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FF6A5C]" />
                  ) : (
                    <PauseCircle className="w-3.5 h-3.5 text-[#2FD3A5]" />
                  )}
                </div>

                <h3 className="text-sm font-heading font-normal tracking-wider text-[#D1E8E2] uppercase mb-2">
                  {lane.title}
                </h3>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2 rounded bg-[#070F0D]/60 border border-[#116466]/30">
                    <span className="text-[#A3C8BF]/60 text-[10px] block font-mono">USER ACTION</span>
                    <span className="text-[#D1E8E2]">{lane.userAction}</span>
                  </div>
                  <div className="p-2 rounded bg-[#070F0D]/60 border border-[#116466]/30">
                    <span className="text-[#A3C8BF]/60 text-[10px] block font-mono">BOT RESPONSE</span>
                    <span className={lane.bad ? 'text-[#FF6A5C]' : 'text-[#2FD3A5]'}>
                      {lane.botAction}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-[#116466]/30 text-[11px] font-mono text-[#A3C8BF]">
                Result: <span className="text-[#FFCB9A]">{lane.result}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Audio Timeline Lanes Visualizer */}
        <div className="p-3.5 rounded-sm deck-card border border-[#116466]/40 bg-[#070F0D]/80">
          <div className="flex items-center justify-between mb-2 text-xs font-mono">
            <span className="text-[#D1E8E2] font-heading tracking-wider uppercase">
              Conversational Audio Timeline Lanes
            </span>
            <span className="text-[10px] text-[#A3C8BF]/60 bg-[#116466]/20 px-2 py-0.5 rounded">
              {content.problem.caption}
            </span>
          </div>

          <div className="space-y-2 text-[11px] font-mono">
            {/* Lane 1 */}
            <div className="grid grid-cols-12 gap-1.5 h-7 items-center bg-[#070F0D]/90 p-1 rounded border border-[#FF6A5C]/20">
              <div className="col-span-10 bg-[#FF6A5C]/20 text-[#FF6A5C] px-2 h-full rounded flex items-center justify-between text-[10px]">
                <span>Traditional Bot speaks continuous monologue...</span>
                <span className="flex items-center gap-1"><VolumeX className="w-3 h-3" /> Audio Collided</span>
              </div>
              <div className="col-span-2 text-[#A3C8BF]/50 text-center text-[10px]">Monologue</div>
            </div>

            {/* Lane 2 */}
            <div className="grid grid-cols-12 gap-1.5 h-7 items-center bg-[#070F0D]/90 p-1 rounded border border-[#FFCB9A]/20">
              <div className="col-span-4 bg-[#2C3531] text-[#D1E8E2] px-2 h-full rounded flex items-center text-[10px]">
                Speaking...
              </div>
              <div className="col-span-2 bg-[#FFCB9A]/20 text-[#FFCB9A] px-1 h-full rounded flex items-center justify-center text-[10px]">
                Cough detected
              </div>
              <div className="col-span-6 border border-dashed border-[#FF6A5C]/30 text-[#FF6A5C] px-2 h-full rounded flex items-center text-[10px]">
                Abrupt stop &amp; context wiped
              </div>
            </div>

            {/* Lane 3: Sunai */}
            <div className="grid grid-cols-12 gap-1.5 h-8 items-center bg-[#070F0D]/90 p-1 rounded border border-[#2FD3A5]/40 shadow-[0_0_15px_rgba(47,211,165,0.1)]">
              <div className="col-span-3 bg-[#116466]/50 text-[#D1E8E2] px-2 h-full rounded flex items-center text-[10px]">
                Speaking sentence 1...
              </div>
              <div className="col-span-2 bg-[#FFCB9A]/30 border border-[#FFCB9A] text-[#FFCB9A] px-1 h-full rounded flex items-center justify-center text-[10px] animate-pulse">
                Sound &#8594; Paused
              </div>
              <div className="col-span-2 bg-[#2FD3A5]/20 border border-[#2FD3A5]/40 text-[#2FD3A5] px-1 h-full rounded flex items-center justify-center text-[10px]">
                Classified: Noise
              </div>
              <div className="col-span-5 bg-[#2FD3A5]/30 text-[#D1E8E2] px-2 h-full rounded flex items-center justify-between text-[10px]">
                <span>Resumes sentence smoothly</span>
                <span className="flex items-center gap-1 text-[#2FD3A5]"><Volume2 className="w-3 h-3" /> Seamless</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

