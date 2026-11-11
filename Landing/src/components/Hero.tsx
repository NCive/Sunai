import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowDown } from 'lucide-react';
import { content } from '../content';
import { VoiceAssistantButton } from './VoiceAssistantButton';

const HeroSphere = lazy(() => import('./HeroSphere').then((m) => ({ default: m.HeroSphere })));

interface HeroProps {
  isOnline: boolean | null;
  onOpenOfflineModal: () => void;
  reducedMotion: boolean;
}

export function Hero({ isOnline, onOpenOfflineModal, reducedMotion }: HeroProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.05,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' as const },
    },
  };

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Typography & CTAs (7 cols) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          {/* Subtitle / Meaning badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border border-white/10 text-xs font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            <span>{content.hero.brandMeaning}</span>
          </div>

          {/* Word-by-word Animated Headline */}
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white tracking-tight leading-[1.12]"
          >
            {content.hero.headlineWords.map((word, idx) => (
              <motion.span
                key={idx}
                variants={wordVariants}
                className={`inline-block mr-2 sm:mr-3 ${
                  word === 'Sunai' || word === 'timing.'
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-accent-blue via-emerald-400 to-white'
                    : ''
                }`}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subline */}
          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl leading-relaxed">
            {content.hero.subline}
          </p>

          {/* Primary & Secondary Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <VoiceAssistantButton
              variant="hero"
              isOnline={isOnline}
              onOfflineClick={onOpenOfflineModal}
              showStatusDot={false}
            />

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full glass-card text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
            >
              <span>{content.hero.secondaryCta}</span>
              <ArrowDown className="w-4 h-4 text-zinc-400" />
            </a>
          </div>

          {/* Chips Strip */}
          <div className="pt-4 flex flex-wrap gap-2 items-center">
            {content.hero.chips.map((chip, idx) => (
              <span
                key={idx}
                className="text-xs px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-zinc-300 font-mono"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Lazy-Loaded Interactive Particle Sphere (5 cols) */}
        <div className="lg:col-span-5 relative flex items-center justify-center min-h-[340px] sm:min-h-[420px]">
          <Suspense
            fallback={
              <div className="relative w-72 h-72 rounded-full border border-accent-blue/30 flex items-center justify-center animate-pulse">
                <div className="w-48 h-48 rounded-full border border-emerald-400/40" />
                <div className="w-24 h-24 rounded-full bg-accent-blue/10 blur-xl" />
              </div>
            }
          >
            <HeroSphere reducedMotion={reducedMotion} />
          </Suspense>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-400 opacity-80 hover:opacity-100 transition-opacity">
        <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">Scroll</span>
        <ChevronDown className="w-4 h-4 animate-bounce text-zinc-400" />
      </div>
    </section>
  );
}
