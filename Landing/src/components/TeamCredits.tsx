import { motion } from 'framer-motion';
import { Linkedin, Award, Heart } from 'lucide-react';
import { content, TeamMember } from '../content';

interface TeamCreditsProps {
  reducedMotion: boolean;
}

export function TeamCredits({ reducedMotion }: TeamCreditsProps) {
  return (
    <section id="team" className="py-24 relative overflow-hidden border-t border-white/5 bg-[#02030B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 text-left">
          <div className="text-xs font-mono tracking-wider text-accent-blue uppercase mb-2">
            {content.team.tag}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
            {content.team.title}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
            <Award className="w-4 h-4 text-accent-blue" />
            <span>{content.team.challenge}</span>
          </div>
        </div>

        {/* 2 Team Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mb-16 text-left">
          {content.team.members.map((member: TeamMember, idx: number) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              className="p-8 rounded-3xl glass-card border border-white/10 flex flex-col justify-between bg-[#0A1024]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                    {member.role}
                  </span>
                  {member.link ? (
                    <a
                      href={member.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                      aria-label={`${member.name} LinkedIn Profile`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-[11px] font-mono text-zinc-400">
                      Co-Creator
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-heading font-bold text-white mb-2">
                  {member.name}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {member.contribution}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-mono text-zinc-400">
                Gnani.ai Internship Challenge Contributor
              </div>
            </motion.div>
          ))}
        </div>

        {/* Acknowledgments Strip */}
        <div className="max-w-4xl p-6 rounded-2xl glass-card border border-white/10 mb-12 text-left bg-[#0A1024]">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-3">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span className="uppercase tracking-wider">Acknowledgments &amp; Credits</span>
          </div>
          <div className="space-y-2">
            {content.team.acknowledgments.map((ack, idx) => (
              <p key={idx} className="text-xs sm:text-sm text-zinc-300 font-mono">
                &bull; {ack}
              </p>
            ))}
          </div>
        </div>

        {/* Hashtags Strip (Non-Link Chips) */}
        <div className="max-w-4xl flex flex-wrap gap-2 text-left">
          {content.team.hashtags.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs font-mono px-3 py-1 rounded-md bg-white/[0.03] border border-white/5 text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}

