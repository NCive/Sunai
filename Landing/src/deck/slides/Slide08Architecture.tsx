import { useState } from 'react';
import { Network, Info } from 'lucide-react';
import { content, ArchNode } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide08Architecture() {
  const [activeNode, setActiveNode] = useState<ArchNode>(content.architecture.nodes[2]);

  return (
    <SlideFrame
      id="architecture"
      sectionLabel="08 / TOPOLOGY"
      title={content.architecture.title}
      subtitle={content.architecture.subtitle}
    >
      <div className="w-full my-auto space-y-3">
        {/* Node Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {content.architecture.nodes.map((node, idx) => {
            const isSelected = activeNode.id === node.id;
            return (
              <button
                type="button"
                key={node.id}
                onClick={() => setActiveNode(node)}
                onMouseEnter={() => setActiveNode(node)}
                className={`p-2.5 rounded-sm text-left transition-all border ${
                  isSelected
                    ? 'bg-[#FFCB9A] text-[#070F0D] border-[#FFCB9A] font-bold shadow-[0_0_15px_rgba(255,203,154,0.3)]'
                    : 'bg-[#070F0D]/80 border-[#116466]/40 hover:border-[#D1E8E2] text-[#D1E8E2]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/20">
                    0{idx + 1}
                  </span>
                  <span className={`text-[9px] font-mono ${isSelected ? 'text-[#070F0D]' : 'text-[#FFCB9A]'}`}>
                    {node.role}
                  </span>
                </div>
                <h4 className="text-xs font-heading font-medium tracking-wide uppercase truncate">
                  {node.title}
                </h4>
                <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-[#2C3531]' : 'text-[#A3C8BF]/70'}`}>
                  {node.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Dynamic Topology Visualizer Strip */}
        <div className="p-3.5 rounded-sm deck-card border border-[#116466]/40 bg-[#070F0D]/90 flex items-start gap-3">
          <div className="mt-0.5 p-1.5 rounded bg-[#116466]/20 border border-[#116466]/40">
            <Info className="w-4 h-4 text-[#FFCB9A]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-heading font-normal tracking-wide uppercase text-[#D1E8E2]">
                {activeNode.title}
              </h4>
              <span className="text-[10px] font-mono text-[#FFCB9A]">
                [{activeNode.role}]
              </span>
            </div>
            <p className="text-xs text-[#A3C8BF] leading-relaxed">
              {activeNode.details}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-[#A3C8BF]/60 pt-1">
          <span className="flex items-center gap-1.5">
            <Network className="w-3 h-3 text-[#2FD3A5]" /> Streaming bi-directional pipeline
          </span>
          <span>Hover or tap any node to inspect role</span>
        </div>
      </div>
    </SlideFrame>
  );
}

