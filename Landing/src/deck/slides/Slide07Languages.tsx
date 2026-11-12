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
              className="p-4 rounded-sm deck-card border border-[#202D4D] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#647394] block uppercase">Language</span>
                    <h3
                      className={`text-lg font-bold text-[#EAF0FF] ${
                        isDevanagari ? 'font-devanagari' : 'font-heading tracking-wider uppercase'
                      }`}
                    >
                      {lang.nativeName}
                      <span className="text-xs font-normal text-[#A1AFCE] ml-2 font-heading">
                        ({lang.name})
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#E5C18B]/10 border border-[#E5C18B]/30 text-[#E5C18B]">
                    {lang.code}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#050817] border border-[#202D4D] mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#A1AFCE] mb-1">
                    <MessageSquareText className="w-3 h-3 text-[#E5C18B]" />
                    <span>Spoken Query Example</span>
                  </div>
                  <p className={`text-xs text-[#EAF0FF] ${isDevanagari ? 'font-devanagari' : 'font-mono'}`}>
                    "{lang.sampleQuestion}"
                  </p>
                </div>

                <p className="text-[11px] text-[#A1AFCE] font-mono">
                  Context: {lang.translation}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#202D4D] flex flex-wrap gap-1.5">
                {lang.greetings.map((greet, gIdx) => (
                  <span
                    key={gIdx}
                    className={`text-[10px] px-2 py-0.5 rounded-full bg-[#111B35] border border-[#202D4D] text-[#EAF0FF] ${
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
