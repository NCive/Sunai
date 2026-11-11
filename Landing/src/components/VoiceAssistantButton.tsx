import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { content } from '../content';

interface VoiceAssistantButtonProps {
  variant?: 'navbar' | 'hero' | 'default' | 'footer';
  isOnline: boolean | null;
  onOfflineClick?: () => void;
  className?: string;
  showStatusDot?: boolean;
}

export function VoiceAssistantButton({
  variant = 'default',
  isOnline,
  onOfflineClick,
  className = '',
  showStatusDot = false,
}: VoiceAssistantButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If assistant is known to be offline and onOfflineClick handler is provided, prevent navigation and open modal
    if (isOnline === false && onOfflineClick) {
      e.preventDefault();
      onOfflineClick();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'navbar':
        return 'px-3.5 py-1.5 text-xs font-medium rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] transition-all';
      case 'hero':
        return 'px-6 py-3.5 text-sm sm:text-base font-medium rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.45)] transition-all duration-300 transform hover:-translate-y-0.5';
      case 'footer':
        return 'px-4 py-2 text-xs font-medium rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-md transition-all';
      default:
        return 'px-5 py-2.5 text-sm font-medium rounded-full bg-white text-zinc-950 hover:bg-zinc-200 shadow-lg hover:shadow-xl transition-all';
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {showStatusDot && (
        <div
          className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300"
          title={isOnline ? content.assistantStatus.labels.online : content.assistantStatus.labels.offline}
          aria-live="polite"
        >
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isOnline
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                : 'bg-zinc-500 shadow-[0_0_4px_rgba(113,113,122,0.4)]'
            }`}
          />
          <span className="hidden lg:inline text-zinc-400">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      )}

      <a
        href={content.assistantUrl}
        onClick={handleClick}
        aria-label="Open the Sunai voice assistant"
        rel="noopener"
        className={`inline-flex items-center justify-center gap-1.5 group select-none ${getVariantStyles()} ${className}`}
      >
        <span>Voice Assistant</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
    </div>
  );
}

