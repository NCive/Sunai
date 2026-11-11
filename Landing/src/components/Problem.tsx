import { motion } from 'framer-motion';
import { VolumeX, Volume2, PauseCircle, AlertTriangle } from 'lucide-react';
import { content } from '../content';

interface ProblemProps {
  reducedMotion: boolean;
}

export function Problem({ reducedMotion }: ProblemProps) {
  return (
    <section id="problem" className="py-24 relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.problem.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.problem.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.problem.description}
          </p>
        </div>

        {/* 3 Split Visual Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {content.problem.lanes.map((lane, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`p-6 rounded-2xl glass-card flex flex-col justify-between border ${
                lane.bad
                  ? 'border-red-500/20 bg-red-950/[0.04]'
                  : 'border-emerald-500/30 bg-emerald-950/[0.06] shadow-[0_0_30px_rgba(16,185,129,0.06)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs font-mono px-2.5 py-1 rounded-md ${
                      lane.bad
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {lane.bad ? 'Flawed Timing' : 'Sunai Solution'}
                  </span>
                  {lane.bad ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <PauseCircle className="w-4 h-4 text-emerald-400" />
                  )}
                </div>

                <h3 className="text-base font-heading font-semibold text-white mb-4">
                  {lane.title}
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded bg-black/40 border border-white/5">
                    <span className="text-zinc-400 block mb-0.5 font-mono">User</span>
                    <span className="text-zinc-300">{lane.userAction}</span>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-white/5">
                    <span className="text-zinc-400 block mb-0.5 font-mono">Bot Reaction</span>
                    <span className={lane.bad ? 'text-red-300' : 'text-emerald-300'}>
                      {lane.botAction}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-zinc-400 font-mono">
                Outcome: <span className="text-white">{lane.result}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Conversation-Timeline Comparison Illustration */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="p-6 sm:p-8 rounded-2xl glass-card border border-white/10 bg-[#090a10]"
        >
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-heading font-semibold text-white tracking-wide">
              Conversational Audio Timeline Lanes
            </h4>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
              {content.problem.caption}
            </span>
          </div>

          <div className="space-y-6">
            {/* Lane 1: Typical Bot Talk-Over */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
                <span>Traditional Voice Assistant</span>
                <span className="text-red-400 flex items-center gap-1">
                  <VolumeX className="w-3 h-3" /> Collided Audio
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2 h-9 items-center bg-black/40 p-1.5 rounded-lg border border-white/5 text-[11px] font-mono">
                <div className="col-span-12 sm:col-span-10 bg-red-500/20 border border-red-500/30 text-red-200 px-3 h-full rounded flex items-center justify-between">
                  <span>Bot speaks continuous monologue...</span>
                  <span className="text-[10px] text-red-400">User speaking ignored</span>
                </div>
                <div className="hidden sm:flex col-span-2 text-zinc-400 text-center items-center justify-center">
                  Monologue
                </div>
              </div>
            </div>

            {/* Lane 2: Aggressive Bot Reset */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
                <span>Aggressive VAD Voice Assistant</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Abrupt Stoppage
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2 h-9 items-center bg-black/40 p-1.5 rounded-lg border border-white/5 text-[11px] font-mono">
                <div className="col-span-4 bg-zinc-800 text-zinc-300 px-3 h-full rounded flex items-center">
                  <span>Speaking...</span>
                </div>
                <div className="col-span-2 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-2 h-full rounded flex items-center justify-center text-[10px]">
                  Cough detected
                </div>
                <div className="col-span-6 border border-dashed border-red-500/30 text-red-400 px-3 h-full rounded flex items-center text-[10px]">
                  Dead stop &amp; memory wiped
                </div>
              </div>
            </div>

            {/* Lane 3: Sunai Pause First */}
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-300 font-mono mb-2">
                <span className="text-white font-semibold">Sunai: Pause First, Decide Second</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Natural Continuity
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2 h-10 items-center bg-emerald-950/20 p-1.5 rounded-lg border border-emerald-500/30 text-[11px] font-mono">
                <div className="col-span-3 bg-zinc-700/80 text-zinc-100 px-3 h-full rounded flex items-center">
                  <span>Speaking sentence 1...</span>
                </div>
                <div className="col-span-2 bg-amber-500/30 border border-amber-400 text-amber-200 px-2 h-full rounded flex items-center justify-center text-[10px] animate-pulse">
                  Sound &#8594; Paused
                </div>
                <div className="col-span-2 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 px-2 h-full rounded flex items-center justify-center text-[10px]">
                  Classified: Noise
                </div>
                <div className="col-span-5 bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 px-3 h-full rounded flex items-center justify-between">
                  <span>Resumes sentence 1 smoothly</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

