import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Terminal, Check, Copy } from 'lucide-react';
import { content } from '../content';

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAnyway: () => void;
}

export function OfflineModal({ isOpen, onClose, onOpenAnyway }: OfflineModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#070F0D]/90 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' as const }}
            className="relative z-10 w-full max-w-xl rounded-sm deck-card border border-[#116466] p-6 shadow-2xl bg-[#070F0D]"
          >
            {/* Corner Brackets */}
            <div className="hud-corner-bracket hud-corner-tl m-2" />
            <div className="hud-corner-bracket hud-corner-tr m-2" />
            <div className="hud-corner-bracket hud-corner-bl m-2" />
            <div className="hud-corner-bracket hud-corner-br m-2" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFCB9A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FFCB9A]"></span>
                </span>
                <div>
                  <h3 id="offline-modal-title" className="text-base sm:text-lg font-heading font-normal tracking-wide uppercase text-[#D1E8E2]">
                    {content.offlineModal.title}
                  </h3>
                  <p className="text-xs font-mono text-[#A3C8BF] mt-0.5">
                    Target: {content.assistantUrl}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[#A3C8BF] hover:text-[#FFCB9A] p-1 rounded hover:bg-[#116466]/20 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#A3C8BF] mb-4 leading-relaxed">
              {content.offlineModal.message}
            </p>

            {/* 3 Start Steps */}
            <div className="space-y-3 mb-6">
              {content.demo.steps.map((step, idx) => (
                <div key={step.step} className="p-3 rounded-sm bg-[#070F0D] border border-[#116466]/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#D1E8E2] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#116466]/30 text-[#FFCB9A] border border-[#116466] flex items-center justify-center text-[10px] font-mono">
                        {step.step}
                      </span>
                      {step.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCommand(step.command, idx)}
                      className="text-xs text-[#A3C8BF] hover:text-[#FFCB9A] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[#116466]/20"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-[#2FD3A5]" />
                          <span className="text-[11px] text-[#2FD3A5]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-[#A3C8BF] bg-black/60 px-2.5 py-1.5 rounded overflow-x-auto whitespace-pre border border-[#116466]/20">
                    <Terminal className="w-3 h-3 inline-block mr-1 text-[#2FD3A5]" />
                    {step.command}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#116466]/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono tracking-wider uppercase text-[#A3C8BF] hover:text-[#D1E8E2] transition-colors"
              >
                {content.offlineModal.closeLabel}
              </button>
              <button
                type="button"
                onClick={onOpenAnyway}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono tracking-wider uppercase bg-[#FFCB9A] text-[#070F0D] hover:bg-[#D9B08C] font-semibold transition-all shadow-sm rounded-sm"
              >
                <span>{content.offlineModal.openAnywayLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
