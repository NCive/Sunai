import { useRef, useEffect, useState } from 'react';
import { content } from '../content';

interface TechStackMarqueeProps {
  reducedMotion: boolean;
}

export function TechStackMarquee({ reducedMotion }: TechStackMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const items = content.techStack.wordmarks;

  return (
    <section
      ref={containerRef}
      className="py-16 relative overflow-hidden border-t border-white/5 bg-[#02030B]"
      aria-label="Technology Stack"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 text-center">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          {content.techStack.tag}
        </span>
      </div>

      {reducedMotion ? (
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-3">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="px-4 py-2 rounded-full glass-card border border-white/10 text-xs sm:text-sm font-mono text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="relative w-full overflow-hidden flex items-center group">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#02030B] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#02030B] to-transparent z-10 pointer-events-none" />

          {/* Continuous Wordmark Marquee Strip */}
          <div
            className={`flex gap-6 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] ${
              !isVisible ? '[animation-play-state:paused]' : ''
            }`}
          >
            {/* Duplicated list for seamless looping */}
            {[...items, ...items, ...items].map((wordmark, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-xs sm:text-sm font-mono text-zinc-300 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                <span>{wordmark}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

