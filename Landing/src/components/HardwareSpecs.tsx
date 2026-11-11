import { motion } from 'framer-motion';
import { Laptop, HardDrive, CheckCircle2 } from 'lucide-react';
import { content } from '../content';

interface HardwareSpecsProps {
  reducedMotion?: boolean;
}

export function HardwareSpecs({ reducedMotion: _reducedMotion }: HardwareSpecsProps) {
  return (
    <section id="hardware" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#07080d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.hardware.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.hardware.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.hardware.subtitle}
          </p>
        </div>

        {/* 2-Column Grid: Hardware Specs & Memory Footprint Meter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Hardware Specs Card (6 cols) */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 flex flex-col justify-between text-left bg-[#090b14]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                  <Laptop className="w-5 h-5 text-accent-blue" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-semibold text-white">
                    Target Machine Specifications
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">
                    Modest Consumer Laptop Profile
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {content.hardware.specs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                  >
                    <span className="text-xs font-mono text-zinc-400">
                      {spec.label}
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-medium text-white">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verified on Ryzen 7 8845HS without dedicated GPU</span>
            </div>
          </div>

          {/* Memory Footprint & Unsloth Quantization Bar (6 cols) */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl glass-card border border-white/10 flex flex-col justify-between text-left bg-[#090b14]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-heading font-semibold text-white">
                    RAM Footprint &amp; Model Quantization
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">
                    Unsloth Precision Quantization
                  </span>
                </div>
              </div>

              {/* Total Footprint Gauge */}
              <div className="mb-6 p-4 rounded-2xl bg-black/50 border border-white/5">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
                  <span>Total Runtime Memory Footprint</span>
                  <span className="text-emerald-400 font-bold">&le; 5 to 5.5 GB</span>
                </div>
                {/* Visual bar */}
                <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '34%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-accent-blue rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mt-1.5">
                  <span>0 GB</span>
                  <span>5.5 GB (Active)</span>
                  <span>16 GB (System Total)</span>
                </div>
              </div>

              {/* LLM Weights Before & After Bar */}
              <div className="space-y-3">
                <span className="text-xs font-mono text-zinc-400 block">
                  LLM Weights: Unsloth Quantization
                </span>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>Original Weights (FP16)</span>
                    <span>{content.hardware.unslothReduction.originalSize}</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded overflow-hidden">
                    <div className="w-full h-full bg-zinc-700 rounded opacity-60" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <div className="flex justify-between text-xs font-mono text-emerald-300 mb-1">
                    <span className="font-semibold">Unsloth Quantized (Q5_K_XL)</span>
                    <span className="font-bold">{content.hardware.unslothReduction.quantizedSize}</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '38%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                      className="h-full bg-emerald-400 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-zinc-400 leading-relaxed font-mono">
              {content.hardware.unslothReduction.description}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
