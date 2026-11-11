import { Zap, Clock } from 'lucide-react';
import { content, PipelineStage } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide09Latency() {
  return (
    <SlideFrame
      id="pipeline"
      sectionLabel="09 / PIPELINE TIMING"
      title={content.latency.title}
      subtitle={content.latency.subtitle}
    >
      <div className="w-full my-auto space-y-4">
        {/* Sunai Concurrent Stream */}
        <div className="p-3.5 rounded-sm deck-card border border-[#2FD3A5]/40 bg-[#070F0D]/90 shadow-[0_0_20px_rgba(47,211,165,0.06)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#D1E8E2]">
              <Zap className="w-3.5 h-3.5 text-[#2FD3A5]" />
              <span className="font-heading tracking-wider uppercase font-normal">
                Sunai Concurrent Streaming Pipeline
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2FD3A5]/10 text-[#2FD3A5] border border-[#2FD3A5]/30">
              Overlapping Execution
            </span>
          </div>

          <div className="space-y-1.5">
            {content.latency.streamingStages.map((stage: PipelineStage, idx: number) => (
              <div key={idx} className="relative">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#A3C8BF] mb-0.5">
                  <span>{stage.name}</span>
                  <span className="text-[#A3C8BF]/60">{stage.note}</span>
                </div>
                <div className="w-full h-5 bg-[#070F0D] rounded overflow-hidden relative border border-[#116466]/40">
                  <div
                    style={{
                      marginLeft: `${stage.startPercent}%`,
                      width: `${stage.widthPercent}%`,
                      backgroundColor: stage.color,
                    }}
                    className="h-full rounded opacity-90 flex items-center px-2 text-[9px] font-mono text-[#070F0D] font-bold truncate"
                  >
                    Active Stream
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sequential Pipeline */}
        <div className="p-3.5 rounded-sm deck-card border border-[#116466]/30 bg-[#070F0D]/70 opacity-80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#A3C8BF]">
              <Clock className="w-3.5 h-3.5 text-[#A3C8BF]" />
              <span className="font-heading tracking-wider uppercase font-normal">
                Standard Sequential Pipeline (Blocking)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2C3531] text-[#A3C8BF] border border-[#116466]/30">
              Stage-by-Stage Wait
            </span>
          </div>

          <div className="space-y-1.5">
            {content.latency.sequentialStages.map((stage: PipelineStage, idx: number) => (
              <div key={idx} className="relative">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#A3C8BF]/70 mb-0.5">
                  <span>{stage.name}</span>
                  <span className="text-[#A3C8BF]/40">{stage.note}</span>
                </div>
                <div className="w-full h-4 bg-[#070F0D] rounded overflow-hidden relative border border-[#116466]/20">
                  <div
                    style={{
                      marginLeft: `${stage.startPercent}%`,
                      width: `${stage.widthPercent}%`,
                      backgroundColor: '#2C3531',
                    }}
                    className="h-full rounded flex items-center px-2 text-[9px] font-mono text-[#A3C8BF] truncate border border-[#116466]/40"
                  >
                    Waiting
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] font-mono text-[#A3C8BF]/60 text-right">
          {content.latency.caption}
        </p>
      </div>
    </SlideFrame>
  );
}

