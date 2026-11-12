import { motion } from 'framer-motion';
import { content, HonestStatusCard } from '../content';

interface HonestStatusProps {
  reducedMotion: boolean;
}

export function HonestStatus({ reducedMotion }: HonestStatusProps) {
  return (
    <section className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.honestStatus.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.honestStatus.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.honestStatus.subtitle}
          </p>
        </div>

        {/* 4 Candid Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.honestStatus.cards.map((card: HonestStatusCard, idx: number) => {
            const isGreen = card.statusDot === 'green';

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="p-6 rounded-2xl glass-card border border-white/10 flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isGreen
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                      }`}
                    />
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      {isGreen ? 'Operational' : 'Active Tuning'}
                    </span>
                  </div>

                  <h3 className="text-base font-heading font-semibold text-white mb-2">
                    {card.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/5 text-[11px] font-mono text-zinc-400">
                  Observation 0{idx + 1}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Optional Stats Container - Controlled by content.stats.enabled */}
        {content.stats.enabled && (
          <div className="mt-12 p-6 rounded-2xl glass-card border border-white/10">
            {/* Future telemetry metrics will render here when enabled */}
          </div>
        )}

      </div>
    </section>
  );
}

