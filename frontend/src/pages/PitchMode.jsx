import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowDown, Users, TrendingUp, Target } from 'lucide-react';
import AuroraShader from '../components/AuroraShader.jsx';

/**
 * Phase 5: Pitch Mode.
 *
 * The one screen in the entire app allowed to be cinematic. Everywhere else
 * is a working surface: dense, scannable, showing everything at once because
 * the user is doing a job. This is the opposite. It is meant to be SHOWN to
 * someone, full screen, on a call.
 *
 * Deliberately outside the Shell: no sidebar, no nav chrome. A pitch with a
 * dashboard sidebar next to it is not a pitch.
 *
 * Every number here comes from data that already exists. Nothing is invented
 * for the sake of the story.
 */
const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

function Section({ children, className = '' }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={reveal}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function PitchMode() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [pitch, setPitch] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('capforge_token');
        const res = await fetch(`/api/pitch/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setPitch(data.pitch);
      } catch (err) {
        console.error('Pitch load failed:', err);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-mint-500 animate-spin" />
      </div>
    );
  }

  if (!pitch) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-[15px]">This venture could not be found.</p>
        <Link to="/app" className="text-mint-500 text-sm hover:underline">Back to CapForge</Link>
      </div>
    );
  }

  const readiness = pitch.readiness;
  const score = readiness ? Math.round(parseFloat(readiness.overall_score)) : null;
  const history = pitch.readiness_history || [];
  const firstScore = history.length > 1 ? Math.round(parseFloat(history[0].overall_score)) : null;
  const founders = pitch.team.filter(t => t.is_founder);
  const others = pitch.team.filter(t => !t.is_founder);

  return (
    <div className="bg-ink-950 min-h-screen text-white">
      {/* Minimal exit affordance. No sidebar: this is meant to be shown. */}
      <Link
        to={`/app/startups/${pitch.id}`}
        className="fixed top-6 left-6 z-30 flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/80 transition-colors"
      >
        <ArrowLeft size={14} /> Exit pitch
      </Link>

      {/* Opening: the venture, full bleed */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <AuroraShader className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
        <div className="relative max-w-4xl mx-auto px-8 py-24">
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase text-mint-500 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
            {(pitch.domain || []).slice(0, 2).join(' · ') || 'Venture'}
            {pitch.stage ? ` · ${pitch.stage}` : ''}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[44px] sm:text-[60px] lg:text-[72px] font-semibold leading-[1.03] tracking-tight"
          >
            {pitch.name}
          </motion.h1>
          {pitch.founder.vision && (
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-xl text-white/60 mt-8 max-w-2xl leading-relaxed italic font-display font-normal"
            >
              {pitch.founder.vision}
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16 flex items-center gap-2 text-white/30 text-[13px]"
          >
            <ArrowDown size={14} className="animate-bounce" /> Scroll
          </motion.div>
        </div>
      </section>

      {/* The problem, given its own screen. One idea at a time. */}
      {pitch.problem && (
        <Section className="min-h-screen flex items-center border-t border-white/5">
          <div className="max-w-4xl mx-auto px-8 py-24">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-white/30 mb-8">The problem</p>
            <p className="font-display text-[30px] sm:text-[38px] lg:text-[46px] font-semibold leading-[1.15] tracking-tight">
              {pitch.problem}
            </p>
          </div>
        </Section>
      )}

      {/* The solution */}
      {pitch.solution && (
        <Section className="min-h-screen flex items-center border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 75% 40%, #7C5CFC 0%, transparent 55%)' }} />
          <div className="relative max-w-4xl mx-auto px-8 py-24">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-mint-500 mb-8">What we are building</p>
            <p className="font-display text-[30px] sm:text-[38px] lg:text-[46px] font-semibold leading-[1.15] tracking-tight">
              {pitch.solution}
            </p>
            {pitch.target_users?.length > 0 && (
              <p className="text-[15px] text-white/50 mt-10">
                For {pitch.target_users.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* The team. Founders first, because that is the actual story. */}
      <Section className="min-h-screen flex items-center border-t border-white/5">
        <div className="max-w-4xl mx-auto px-8 py-24 w-full">
          <p className="text-xs font-medium tracking-[0.16em] uppercase text-white/30 mb-3">Who is building it</p>
          <h2 className="font-display text-[30px] sm:text-[38px] font-semibold leading-tight mb-12">
            {founders.length > 1
              ? `${founders.length} founders${others.length > 0 ? `, ${others.length} more on the team` : ''}`
              : 'The team'}
          </h2>
          <div className="space-y-8">
            {founders.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex items-start gap-5 pb-8 border-b border-white/10"
              >
                <div className="w-12 h-12 rounded-full bg-mint-500/15 flex items-center justify-center text-[15px] font-semibold text-mint-500 shrink-0">
                  {m.display_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[19px] font-semibold">{m.display_name}</p>
                  <p className="text-[14px] text-mint-500 mt-0.5">{m.role || 'Founder'}</p>
                  {m.headline && <p className="text-[14px] text-white/50 mt-1.5">{m.headline}</p>}
                </div>
              </motion.div>
            ))}
            {others.length > 0 && (
              <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
                {others.map((m, i) => (
                  <div key={i} className="text-[14px] text-white/50">
                    <span className="text-white/80">{m.display_name}</span> · {m.role}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Traction: the real readiness trajectory, not a bare number */}
      {score !== null && (
        <Section className="min-h-screen flex items-center border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 25% 60%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative max-w-4xl mx-auto px-8 py-24 w-full">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-white/30 mb-8">Where we are</p>
            <div className="flex items-baseline gap-4">
              <span className="font-display text-[80px] lg:text-[110px] font-semibold leading-none text-mint-500">{score}</span>
              <span className="text-[17px] text-white/40">readiness</span>
            </div>
            {firstScore !== null && firstScore !== score && (
              <p className="text-[19px] text-white/70 mt-8 max-w-xl leading-relaxed">
                {score > firstScore
                  ? `We started at ${firstScore}. Every point since came from real work: people joining, roles filled, risks closed.`
                  : `We started at ${firstScore}. The number moves with what is actually true about the venture.`}
              </p>
            )}
            <div className="grid sm:grid-cols-3 gap-6 mt-14">
              <div className="border-t border-white/15 pt-5">
                <Users size={16} className="text-mint-500 mb-3" />
                <p className="font-display text-[28px] font-semibold">{pitch.team.length}</p>
                <p className="text-[13px] text-white/45 mt-1">on the team</p>
              </div>
              <div className="border-t border-white/15 pt-5">
                <Target size={16} className="text-mint-500 mb-3" />
                <p className="font-display text-[28px] font-semibold">{pitch.filled_count}</p>
                <p className="text-[13px] text-white/45 mt-1">roles filled</p>
              </div>
              <div className="border-t border-white/15 pt-5">
                <TrendingUp size={16} className="text-mint-500 mb-3" />
                <p className="font-display text-[28px] font-semibold">{pitch.open_gaps.length}</p>
                <p className="text-[13px] text-white/45 mt-1">still hiring for</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* What is next: real milestones only */}
      {pitch.milestones?.length > 0 && (
        <Section className="min-h-screen flex items-center border-t border-white/5">
          <div className="max-w-4xl mx-auto px-8 py-24 w-full">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-white/30 mb-3">What happens next</p>
            <h2 className="font-display text-[30px] sm:text-[38px] font-semibold leading-tight mb-12">The road ahead</h2>
            <div className="space-y-6">
              {pitch.milestones.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex items-start gap-5 pb-6 border-b border-white/10"
                >
                  <span className="font-display text-[26px] font-semibold text-white/15 shrink-0 w-10">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[18px] font-medium">{m.title}</p>
                    {m.description && <p className="text-[14px] text-white/50 mt-1.5 leading-relaxed">{m.description}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Origin: only shown when this venture genuinely began as a spark */}
      {pitch.origin_spark && (
        <Section className="border-t border-white/5">
          <div className="max-w-3xl mx-auto px-8 py-28 text-center">
            <p className="text-xs font-medium tracking-[0.16em] uppercase text-mint-500 mb-6">How it started</p>
            <p className="font-display text-[24px] lg:text-[30px] font-normal italic leading-relaxed text-white/75">
              “{pitch.origin_spark.title}”
            </p>
            <p className="text-[14px] text-white/35 mt-6">
              Posted as an idea on {new Date(pitch.origin_spark.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Someone believed it. Now it is a company.
            </p>
          </div>
        </Section>
      )}

      <footer className="border-t border-white/5 py-10">
        <p className="text-center text-[13px] text-white/25">{pitch.name} · Built on CapForge</p>
      </footer>
    </div>
  );
}
