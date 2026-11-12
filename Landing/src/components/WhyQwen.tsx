import { motion } from 'framer-motion';
import { Sparkles, Check, Database, Zap, GitBranch, Server } from 'lucide-react';
import { content, QwenPoint } from '../content';

interface WhyQwenProps {
  reducedMotion: boolean;
}

export function WhyQwen({ reducedMotion }: WhyQwenProps) {
  const icons = [
    <Sparkles className="w-5 h-5 text-accent-blue" />,
    <Database className="w-5 h-5 text-emerald-400" />,
    <Zap className="w-5 h-5 text-purple-400" />,
    <GitBranch className="w-5 h-5 text-amber-400" />,
    <Server className="w-5 h-5 text-cyan-400" />,
  ];

  return (
    <section className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.whyQwen.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.whyQwen.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.whyQwen.subtitle}
          </p>
        </div>

        {/* 5 Staggered Advantage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.whyQwen.points.map((point: QwenPoint, idx: number) => {
            const isWide = idx === 3 || idx === 4;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className={`p-6 sm:p-8 rounded-2xl glass-card glass-card-hover border border-white/10 flex flex-col justify-between text-left ${
                  isWide ? 'md:col-span-1 lg:col-span-1' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {icons[idx % icons.length]}
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      Point 0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-base font-heading font-semibold text-white mb-2">
                    {point.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {point.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Validated Architecture Choice</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

