import { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Info } from 'lucide-react';
import { content, ArchNode } from '../content';

interface ArchitectureProps {
  reducedMotion: boolean;
}

export function Architecture({ reducedMotion }: ArchitectureProps) {
  const [activeNode, setActiveNode] = useState<ArchNode>(content.architecture.nodes[2]); // Default: Backend Turn Manager

  return (
    <section id="architecture" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.architecture.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.architecture.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.architecture.subtitle}
          </p>
        </div>

        {/* Interactive Architecture Flow Canvas */}
        <div className="p-6 sm:p-10 rounded-3xl glass-card border border-white/10 bg-[#0A1024] mb-8">
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Network className="w-4 h-4 text-accent-blue" />
              <span>Full Pipeline Topology</span>
            </div>
            <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
              Hover or click any node to inspect role
            </span>
          </div>

          {/* Topology Grid of Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {content.architecture.nodes.map((node: ArchNode, idx: number) => {
              const isSelected = activeNode.id === node.id;
              return (
                <button
                  type="button"
                  key={node.id}
                  onClick={() => setActiveNode(node)}
                  onMouseEnter={() => setActiveNode(node)}
                  className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden ${
                    isSelected
                      ? 'bg-white/10 border-accent-blue shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                      : 'bg-black/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-zinc-400">
                      Node 0{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-accent-blue font-semibold">
                      {node.role}
                    </span>
                  </div>

                  <h3 className="text-sm font-heading font-semibold text-white mb-1">
                    {node.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {node.subtitle}
                  </p>

                  {/* Flow connection indicators */}
                  {idx < content.architecture.nodes.length - 1 && (
                    <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/20 pointer-events-none z-10" />
                  )}
                </button>
              );
            })}
          </div>

          {/* SVG Animated Connector Diagram */}
          <div className="relative w-full h-16 hidden md:block mb-6 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 1000 60" preserveAspectRatio="none">
              {/* Static Track Line */}
              <line
                x1="40"
                y1="30"
                x2="960"
                y2="30"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              
              {/* Active Animated Traveling Packet */}
              {!reducedMotion && (
                <motion.circle
                  r="4"
                  fill="#2FD3A5"
                  initial={{ cx: 40, cy: 30 }}
                  animate={{ cx: [40, 960] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
              )}

              {/* Waypoint Markers */}
              <circle cx="120" cy="30" r="5" fill="#2FD3A5" />
              <circle cx="370" cy="30" r="5" fill="#244DA8" />
              <circle cx="620" cy="30" r="5" fill="#244DA8" />
              <circle cx="870" cy="30" r="5" fill="#2FD3A5" />
            </svg>
          </div>

          {/* Inspector Panel for Selected Node */}
          <div className="p-5 rounded-xl bg-black/60 border border-white/10 flex items-start gap-3.5 text-left">
            <Info className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-heading font-semibold text-white">
                  {activeNode.title}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  [{activeNode.role}]
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {activeNode.details}
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

