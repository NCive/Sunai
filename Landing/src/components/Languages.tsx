import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareText } from 'lucide-react';
import { content, LanguageCard } from '../content';

interface TypewriterTextProps {
  text: string;
  reducedMotion: boolean;
}

function TypewriterText({ text, reducedMotion }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState(reducedMotion ? text : '');

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedText(text);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [text, reducedMotion]);

  return (
    <span className="font-mono text-xs sm:text-sm text-zinc-100">
      {displayedText}
      {!reducedMotion && displayedText.length < text.length && (
        <span className="inline-block w-1.5 h-3.5 bg-accent-blue ml-1 animate-pulse" />
      )}
    </span>
  );
}

interface LanguagesProps {
  reducedMotion: boolean;
}

export function Languages({ reducedMotion }: LanguagesProps) {
  return (
    <section id="languages" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#06070a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.languages.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.languages.title}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            {content.languages.subtitle}
          </p>
        </div>

        {/* 4 Large Language Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {content.languages.cards.map((lang: LanguageCard, idx: number) => {
            const isDevanagari = lang.code === 'hi' || lang.code === 'mr';

            return (
              <motion.div
                key={lang.code}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-6 sm:p-8 rounded-2xl glass-card glass-card-hover border border-white/10 flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="text-xs font-mono text-zinc-400 block mb-0.5">
                        Language
                      </span>
                      <h3
                        className={`text-xl sm:text-2xl font-bold text-white ${
                          isDevanagari ? 'font-devanagari' : 'font-heading'
                        }`}
                      >
                        {lang.nativeName}
                        <span className="text-sm font-normal text-zinc-400 ml-2 font-heading">
                          ({lang.name})
                        </span>
                      </h3>
                    </div>
                    <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-accent-blue/10 border border-accent-blue/20 text-accent-blue">
                      {lang.code}
                    </span>
                  </div>

                  {/* Sample Question Terminal with Typewriter */}
                  <div className="mb-4 p-4 rounded-xl bg-black/50 border border-white/10 min-h-[90px] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mb-2">
                      <MessageSquareText className="w-3.5 h-3.5 text-accent-blue" />
                      <span>Sample Spoken Query</span>
                    </div>
                    <p className={isDevanagari ? 'font-devanagari text-zinc-100 text-sm' : ''}>
                      <TypewriterText text={lang.sampleQuestion} reducedMotion={reducedMotion} />
                    </p>
                  </div>

                  <p className="text-xs text-zinc-400 font-mono mb-4">
                    Context: {lang.translation}
                  </p>
                </div>

                {/* Marquee Greetings Strip */}
                <div className="pt-4 border-t border-white/5 overflow-hidden">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {lang.greetings.map((greet, gIdx) => (
                      <span
                        key={gIdx}
                        className={`text-xs px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 whitespace-nowrap ${
                          isDevanagari ? 'font-devanagari' : 'font-sans'
                        }`}
                      >
                        {greet}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

