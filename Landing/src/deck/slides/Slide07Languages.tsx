import { MessageSquareText } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide07Languages() {
  return (
    <SlideFrame
      id="languages"
      sectionLabel="07 / MULTILINGUAL"
      title={content.languages.title}
      subtitle={content.languages.subtitle}
    >
      <div className="w-full my-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {content.languages.cards.map((lang) => {
          const isDevanagari = lang.code === 'hi' || lang.code === 'mr';

          return (
            <div
              key={lang.code}
              className="p-4 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#A3C8BF]/60 block uppercase">Language</span>
                    <h3
                      className={`text-lg font-bold text-[#D1E8E2] ${
                        isDevanagari ? 'font-devanagari' : 'font-heading tracking-wider uppercase'
                      }`}
                    >
                      {lang.nativeName}
                      <span className="text-xs font-normal text-[#A3C8BF] ml-2 font-heading">
                        ({lang.name})
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFCB9A]/10 border border-[#FFCB9A]/30 text-[#FFCB9A]">
                    {lang.code}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#070F0D] border border-[#116466]/40 mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A3C8BF]/70 mb-1">
                    <MessageSquareText className="w-3 h-3 text-[#FFCB9A]" />
                    <span>Spoken Query Example</span>
                  </div>
                  <p className={`text-xs text-[#D1E8E2] ${isDevanagari ? 'font-devanagari' : 'font-mono'}`}>
                    "{lang.sampleQuestion}"
                  </p>
                </div>

                <p className="text-[11px] text-[#A3C8BF] font-mono">
                  Context: {lang.translation}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#116466]/30 flex flex-wrap gap-1.5">
                {lang.greetings.map((greet, gIdx) => (
                  <span
                    key={gIdx}
                    className={`text-[10px] px-2 py-0.5 rounded-full bg-[#116466]/20 border border-[#116466]/40 text-[#D1E8E2] ${
                      isDevanagari ? 'font-devanagari' : 'font-sans'
                    }`}
                  >
                    {greet}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

