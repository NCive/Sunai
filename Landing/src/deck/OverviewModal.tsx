import { useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { SLIDES_REGISTRY } from './slides';

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
}

export function OverviewModal({
  isOpen,
  onClose,
  currentSlideIndex,
  onSelectSlide,
}: OverviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overview-modal-title"
    >
      {/* Deep Space Backdrop */}
      <div
        className="fixed inset-0 bg-[#02030B]/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog Shell */}
      <div className="relative z-10 w-full max-w-6xl max-h-[90vh] flex flex-col rounded-sm deck-card border border-[#202D4D] p-6 shadow-2xl bg-[#0A1024]/95 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202D4D] mb-6 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-[1px] bg-[#2FD3A5]" />
              <span className="text-[10px] font-mono tracking-deck-wide text-[#2FD3A5] uppercase">
                DECK SLIDE SORTER
              </span>
            </div>
            <h3 id="overview-modal-title" className="text-lg sm:text-xl font-heading font-light tracking-deck-wide text-[#EAF0FF] uppercase">
              Presentation Overview (16 Slides)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A1AFCE] hover:text-[#62C9E8] rounded-sm hover:bg-[#111B35] transition-colors"
            aria-label="Close overview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 16 Slides Grid */}
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {SLIDES_REGISTRY.map((slide, idx) => {
            const isCurrent = idx === currentSlideIndex;

            return (
              <button
                type="button"
                key={slide.id}
                onClick={() => {
                  onSelectSlide(idx);
                  onClose();
                }}
                className={`p-3 rounded-sm text-left transition-all border flex flex-col justify-between group aspect-[16/10] ${
                  isCurrent
                    ? 'border-[#62C9E8] bg-[#111B35] shadow-[0_0_15px_rgba(71,127,245,0.3)]'
                    : 'border-[#202D4D] bg-[#0A1024]/60 hover:border-[#244DA8] hover:bg-[#111B35]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-[#62C9E8] font-bold">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40 text-[#A1AFCE]">
                      {slide.transition}
                    </span>
                  </div>

                  <h4 className="text-xs font-heading tracking-wide uppercase text-[#EAF0FF] group-hover:text-white line-clamp-2">
                    {slide.title}
                  </h4>
                </div>

                <div className="pt-2 border-t border-[#202D4D] flex items-center justify-between text-[9px] font-mono text-[#A1AFCE]">
                  <span>{slide.sectionLabel.split('/')[1]?.trim() || slide.id}</span>
                  <ArrowRight className="w-3 h-3 text-[#62C9E8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-4 mt-4 border-t border-[#202D4D] flex items-center justify-between text-[11px] font-mono text-[#647394] flex-shrink-0">
          <span>Click any card to jump immediately &bull; Press ESC to close</span>
          <span>Keyboard: Left / Right &bull; O to toggle</span>
        </div>
      </div>
    </div>
  );
}
