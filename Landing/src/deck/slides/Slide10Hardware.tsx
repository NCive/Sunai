import { Laptop, HardDrive, CheckCircle2 } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide10Hardware() {
  return (
    <SlideFrame
      id="hardware"
      sectionLabel="10 / LOCAL FOOTPRINT"
      title={content.hardware.title}
      subtitle={content.hardware.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specs Card */}
        <div className="p-4 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded bg-[#116466]/30 border border-[#116466]/50 flex items-center justify-center">
                <Laptop className="w-4 h-4 text-[#FFCB9A]" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-medium tracking-wide uppercase text-[#D1E8E2]">
                  Target Hardware Profile
                </h3>
                <span className="text-[10px] font-mono text-[#A3C8BF]/60">Consumer Laptop Baseline</span>
              </div>
            </div>

            <div className="space-y-2">
              {content.hardware.specs.map((spec, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-[#070F0D] border border-[#116466]/30 flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-[#A3C8BF]">{spec.label}</span>
                  <span className="text-[#FFCB9A] font-semibold">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#116466]/30 flex items-center gap-1.5 text-[11px] font-mono text-[#2FD3A5]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified on Ryzen 7 8845HS without dedicated GPU</span>
          </div>
        </div>

        {/* Quantization Bar Card */}
        <div className="p-4 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded bg-[#116466]/30 border border-[#116466]/50 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-[#2FD3A5]" />
              </div>
              <div>
                <h3 className="text-sm font-heading font-medium tracking-wide uppercase text-[#D1E8E2]">
                  Memory &amp; Model Footprint
                </h3>
                <span className="text-[10px] font-mono text-[#A3C8BF]/60">Unsloth Precision Quantization</span>
              </div>
            </div>

            {/* Total Footprint Bar */}
            <div className="p-2.5 rounded bg-[#070F0D] border border-[#116466]/40 mb-3 text-xs font-mono">
              <div className="flex justify-between mb-1">
                <span className="text-[#A3C8BF]">Total Active RAM Footprint</span>
                <span className="text-[#2FD3A5] font-bold">&le; 5 to 5.5 GB</span>
              </div>
              <div className="w-full h-3 bg-[#070F0D] rounded overflow-hidden border border-[#116466]/50">
                <div className="h-full bg-gradient-to-r from-[#116466] to-[#2FD3A5] w-[34%] rounded" />
              </div>
              <div className="flex justify-between text-[9px] text-[#A3C8BF]/60 mt-1">
                <span>0 GB</span>
                <span>5.5 GB Active</span>
                <span>16 GB System Total</span>
              </div>
            </div>

            {/* Weights Reduction Comparison */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-2 rounded bg-[#070F0D]/60 border border-[#116466]/30">
                <div className="flex justify-between text-[11px] text-[#A3C8BF]/70 mb-0.5">
                  <span>Original FP16 Weights</span>
                  <span>{content.hardware.unslothReduction.originalSize}</span>
                </div>
                <div className="w-full h-2 bg-[#2C3531] rounded" />
              </div>

              <div className="p-2 rounded bg-[#070F0D] border border-[#2FD3A5]/40">
                <div className="flex justify-between text-[11px] text-[#2FD3A5] mb-0.5 font-bold">
                  <span>Unsloth Quantized (Q5_K_XL)</span>
                  <span>{content.hardware.unslothReduction.quantizedSize}</span>
                </div>
                <div className="w-full h-2 bg-[#070F0D] rounded overflow-hidden">
                  <div className="h-full bg-[#2FD3A5] w-[38%] rounded" />
                </div>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[10px] font-mono text-[#A3C8BF]/80 leading-relaxed">
            {content.hardware.unslothReduction.description}
          </p>
        </div>
      </div>
    </SlideFrame>
  );
}

