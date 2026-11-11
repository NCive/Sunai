import { Linkedin, Award, Heart } from 'lucide-react';
import { content } from '../../content';
import { SlideFrame } from '../SlideFrame';

export function Slide15Team() {
  return (
    <SlideFrame
      id="team"
      sectionLabel="15 / CONTRIBUTORS"
      title={content.team.title}
      subtitle={content.team.challenge}
    >
      <div className="w-full my-auto space-y-3">
        {/* Team Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-4xl mx-auto">
          {content.team.members.map((member) => (
            <div
              key={member.name}
              className="p-4 rounded-sm deck-card border border-[#116466]/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#116466]/20 border border-[#116466]/40 text-[#D1E8E2]">
                    {member.role}
                  </span>
                  {member.link ? (
                    <a
                      href={member.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#A3C8BF] hover:text-[#FFCB9A] p-1 rounded hover:bg-[#116466]/20 transition-colors"
                      aria-label={`${member.name} LinkedIn Profile`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono text-[#A3C8BF]/60">Co-Creator</span>
                  )}
                </div>

                <h3 className="text-base font-heading font-medium tracking-wide uppercase text-[#D1E8E2] mb-1">
                  {member.name}
                </h3>

                <p className="text-xs text-[#A3C8BF] leading-relaxed">
                  {member.contribution}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#116466]/30 text-[9px] font-mono text-[#A3C8BF]/60">
                Gnani.ai Internship Challenge Contributor
              </div>
            </div>
          ))}
        </div>

        {/* Acknowledgments & Hashtags */}
        <div className="max-w-4xl mx-auto p-3 rounded-sm deck-card border border-[#116466]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#D1E8E2]">
            <Heart className="w-3.5 h-3.5 text-[#FF6A5C]" />
            <span>Special thanks to Gnani.ai</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#FFCB9A]">
            <Award className="w-3 h-3 text-[#FFCB9A]" />
            <span>#GreatIndianAIInternshipChallenge</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-1.5 pt-1">
          {content.team.hashtags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#116466]/20 border border-[#116466]/30 text-[#A3C8BF]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

