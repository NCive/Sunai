import { motion } from 'framer-motion';
import { Languages, GitCommit, ShieldCheck, Eye, Cpu } from 'lucide-react';
import { content } from '../content';

interface FeaturesBentoProps {
  reducedMotion: boolean;
}

export function FeaturesBento({ reducedMotion }: FeaturesBentoProps) {
  const icons = [
    <Languages className="w-5 h-5 text-accent-blue" />,
    <GitCommit className="w-5 h-5 text-purple-400" />,
    <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    <Eye className="w-5 h-5 text-amber-400" />,
    <Cpu className="w-5 h-5 text-cyan-400" />,
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.features.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.features.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.features.subtitle}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.features.items.map((item, idx) => {
            // First item spans 2 columns on lg for nice bento layout
            const isWide = idx === 0 || idx === 4;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className={`p-6 sm:p-8 rounded-2xl glass-card glass-card-hover flex flex-col justify-between text-left ${
                  isWide ? 'md:col-span-2 lg:col-span-2' : 'col-span-1'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {icons[idx % icons.length]}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded bg-white/5 border border-white/10 text-zinc-300">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-heading font-semibold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400">
                    Feature 0{idx + 1}
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-mono text-zinc-400">Verified</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

