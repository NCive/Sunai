import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';
import { content, PipelineStage } from '../content';

interface LatencyPipelineProps {
  reducedMotion?: boolean;
}

export function LatencyPipeline({ reducedMotion: _reducedMotion }: LatencyPipelineProps) {
  return (
    <section id="pipeline" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.latency.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.latency.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.latency.subtitle}
          </p>
        </div>

        {/* Pipeline Comparison Card */}
        <div className="p-6 sm:p-10 rounded-3xl glass-card border border-white/10 bg-[#0A1024] space-y-10">
          
          {/* Top: Sunai Overlapping Streaming Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-heading font-semibold text-white">
                  Sunai Concurrent Streaming Pipeline
                </h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Overlapping Execution
              </span>
            </div>

            <div className="space-y-3 p-4 sm:p-6 rounded-2xl bg-black/50 border border-white/5">
              {content.latency.streamingStages.map((stage: PipelineStage, idx: number) => (
                <div key={idx} className="relative">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>{stage.name}</span>
                    <span className="text-[11px] text-zinc-400">{stage.note}</span>
                  </div>
                  <div className="w-full h-7 bg-zinc-900 rounded-lg overflow-hidden relative border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${stage.widthPercent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: idx * 0.15, ease: 'easeOut' }}
                      style={{
                        marginLeft: `${stage.startPercent}%`,
                        backgroundColor: stage.color,
                      }}
                      className="h-full rounded-md opacity-90 flex items-center px-2.5 text-[10px] font-mono text-black font-semibold truncate"
                    >
                      Active Stream
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Traditional Sequential Pipeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm sm:text-base font-heading font-semibold text-zinc-400">
                  Standard Sequential Pipeline (Blocking)
                </h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Full Stage Waiting
              </span>
            </div>

            <div className="space-y-3 p-4 sm:p-6 rounded-2xl bg-black/40 border border-white/5">
              {content.latency.sequentialStages.map((stage: PipelineStage, idx: number) => (
                <div key={idx} className="relative">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-1">
                    <span>{stage.name}</span>
                    <span className="text-[11px] text-zinc-300">{stage.note}</span>
                  </div>
                  <div className="w-full h-6 bg-zinc-900 rounded-lg overflow-hidden relative border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${stage.widthPercent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: idx * 0.2, ease: 'easeOut' }}
                      style={{
                        marginLeft: `${stage.startPercent}%`,
                        backgroundColor: '#244DA8',
                      }}
                      className="h-full rounded-md flex items-center px-2 text-[10px] font-mono text-white font-medium truncate"
                    >
                      Waiting &amp; Processing
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Caption & Disclaimer */}
          <div className="pt-2 border-t border-white/10 text-left">
            <p className="text-xs font-mono text-zinc-400">
              {content.latency.caption}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
