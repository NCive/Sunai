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
            className="fixed inset-0 bg-[#02030B]/90 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' as const }}
            className="relative z-10 w-full max-w-xl rounded-sm deck-card border border-[#202D4D] p-6 shadow-2xl bg-[#0A1024]"
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E5C18B] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E5C18B]"></span>
                </span>
                <div>
                  <h3 id="offline-modal-title" className="text-base sm:text-lg font-heading font-normal tracking-wide uppercase text-[#EAF0FF]">
                    {content.offlineModal.title}
                  </h3>
                  <p className="text-xs font-mono text-[#A1AFCE] mt-0.5">
                    Target: {content.assistantUrl}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[#A1AFCE] hover:text-[#62C9E8] p-1 rounded hover:bg-[#111B35] transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#A1AFCE] mb-4 leading-relaxed">
              {content.offlineModal.message}
            </p>

            {/* 3 Start Steps */}
            <div className="space-y-3 mb-6">
              {content.demo.steps.map((step, idx) => (
                <div key={step.step} className="p-3 rounded-sm bg-[#050817]/60 border border-[#202D4D]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[#EAF0FF] flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#111B35] text-[#62C9E8] border border-[#202D4D] flex items-center justify-center text-[10px] font-mono">
                        {step.step}
                      </span>
                      {step.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCommand(step.command, idx)}
                      className="text-xs text-[#A1AFCE] hover:text-[#62C9E8] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-[#111B35]"
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
                  <div className="font-mono text-xs text-[#EAF0FF]/80 bg-black/60 px-2.5 py-1.5 rounded overflow-x-auto whitespace-pre border border-[#202D4D]">
                    <Terminal className="w-3 h-3 inline-block mr-1 text-[#2FD3A5]" />
                    {step.command}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#202D4D]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono tracking-wider uppercase text-[#A1AFCE] hover:text-[#EAF0FF] transition-colors"
              >
                {content.offlineModal.closeLabel}
              </button>
              <button
                type="button"
                onClick={onOpenAnyway}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono tracking-wider uppercase bg-[#477FF5] text-white hover:bg-[#5b8ff7] font-semibold transition-all shadow-[0_0_12px_rgba(71,127,245,0.35)] rounded-sm"
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
