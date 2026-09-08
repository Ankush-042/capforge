import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Flame, MessageCircle, Check } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getSpark, resonateWithSpark, commitToSpark } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

/**
 * Spark detail. Phase 2, The First Act.
 *
 * This is where the founding moment actually happens. Two deliberate
 * differences from every other screen in the app:
 *
 * 1. There is no score anywhere. Not a match percentage, not a ranking. You
 *    read the idea and decide for yourself.
 * 2. Resonating is not applying. There is no accept or reject on the author's
 *    side, only a conversation that starts immediately.
 */
export default function SparkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [committing, setCommitting] = useState(false);

  async function load() {
    const { ok, data: res } = await getSpark(id);
    if (ok && res.success) setData(res);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function handleResonate() {
    if (message.trim().length < 20 || sending) return;
    setSending(true);
    const { ok, data: res } = await resonateWithSpark(id, message);
    setSending(false);
    if (ok && res.success) {
      showToast('They know. The conversation is open.');
      navigate(`/app/inbox/${res.conversationId}`);
    } else {
      showToast(res.error === 'MESSAGE_TOO_SHORT' ? 'Say a bit more about why this landed.' : 'Could not send.', 'error');
    }
  }

  async function handleCommit() {
    setCommitting(true);
    const { ok, data: res } = await commitToSpark(id);
    setCommitting(false);
    if (ok && res.success) {
      if (res.formed && res.startupId) {
        // The founding moment actually happened: take them straight into
        // the venture that now exists, rather than leaving them on a page
        // that just says it does.
        showToast(res.structured === false ? 'It is real. Structuring did not finish, you can re-run it.' : 'It is real now. Welcome to your venture.');
        navigate(`/app/startups/${res.startupId}`);
        return;
      }
      showToast('Committed. Waiting on them.');
      await load();
    } else {
      showToast(
        res.error === 'NO_RESONANCE_YET' ? 'Nobody has resonated with this yet.'
        : res.error === 'FORMATION_FAILED' ? 'Could not create the venture. Your commitment is saved, try again.'
        : 'Could not commit.', 'error');
    }
  }

  if (loading) {
    return <Shell title="Spark"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;
  }
  if (!data) {
    return <Shell title="Spark"><p className="text-[15px] text-ink-500">This spark could not be found.</p></Shell>;
  }

  const { spark, resonances, isAuthor } = data;
  const myResonance = !isAuthor ? resonances[0] : null;

  return (
    <Shell title={spark.title}>
      <Link to="/app/sparks" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
        <ArrowLeft size={15} /> Back to sparks
      </Link>

      <div className="max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden rounded-2xl bg-ink-950 p-8 mb-6">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, #7C5CFC 0%, transparent 55%), radial-gradient(circle at 85% 70%, #1F5D52 0%, transparent 55%)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[11px] font-medium tracking-wide uppercase text-mint-500 bg-mint-500/15 px-2.5 py-1 rounded-md">
                {spark.status === 'FORMING' ? 'Forming' : spark.status === 'FORMED' ? 'Now a venture' : 'Open'}
              </span>
              {spark.formed_startup_id && (
                <Link to={`/app/startups/${spark.formed_startup_id}`} className="text-xs font-medium text-mint-500 hover:text-mint-500/80 transition-colors">
                  Open the venture
                </Link>
              )}
              {parseInt(spark.view_count) > 0 && <span className="text-xs text-white/40">{spark.view_count} views</span>}
            </div>
            <h1 className="font-display text-[30px] lg:text-[36px] font-semibold text-white leading-tight">{spark.title}</h1>
            <div className="flex items-center gap-2.5 mt-5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[13px] font-semibold text-white">
                {spark.author_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-medium text-white">{spark.author_name}</p>
                {spark.author_headline && <p className="text-[12px] text-white/50">{spark.author_headline}</p>}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="bg-surface rounded-2xl border border-surface-border shadow-card p-8 mb-6">
          <p className="text-[11px] font-medium tracking-wide uppercase text-ink-300 mb-3">The idea</p>
          <p className="text-[17px] text-ink-900 leading-relaxed whitespace-pre-wrap">{spark.the_idea}</p>

          {spark.why_me && (
            <div className="mt-8 pt-6 border-t border-surface-border">
              <p className="text-[11px] font-medium tracking-wide uppercase text-ink-300 mb-3">Why them</p>
              <p className="text-[16px] text-ink-700 leading-relaxed whitespace-pre-wrap">{spark.why_me}</p>
            </div>
          )}

          {spark.looking_for && (
            <div className="mt-8 pt-6 border-t border-surface-border">
              <p className="text-[11px] font-medium tracking-wide uppercase text-ink-300 mb-3">Who they are hoping to find</p>
              <p className="text-[16px] text-ink-700 leading-relaxed whitespace-pre-wrap">{spark.looking_for}</p>
            </div>
          )}

          {spark.tags?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-surface-border flex flex-wrap gap-2">
              {spark.tags.map((t) => (
                <span key={t} className="text-[12px] text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Author view: who wants in */}
        {isAuthor && (
          <div className="bg-surface rounded-2xl border border-surface-border shadow-card p-8">
            <div className="flex items-center gap-2 mb-5">
              <Flame size={17} className="text-violet-500" />
              <p className="text-[15px] font-semibold text-ink-900">
                {resonances.length === 0 ? 'Nobody has said anything yet' : `${resonances.length} ${resonances.length === 1 ? 'person wants' : 'people want'} to build this with you`}
              </p>
            </div>
            {resonances.length === 0 ? (
              <p className="text-[15px] text-ink-500 leading-relaxed">Give it time. When someone reads this and it lands for them, they will tell you here.</p>
            ) : (
              <div className="space-y-4">
                {resonances.map((r) => (
                  <div key={r.id} className="border border-surface-border rounded-xl p-5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-[12px] font-semibold text-violet-700">
                          {r.display_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-ink-900">{r.display_name}</p>
                          {r.headline && <p className="text-[12px] text-ink-500">{r.headline}</p>}
                        </div>
                      </div>
                      {r.conversation_id && (
                        <Link to={`/app/inbox/${r.conversation_id}`} className="flex items-center gap-1.5 text-[13px] font-medium text-violet-700 hover:text-violet-600 transition-colors shrink-0">
                          <MessageCircle size={14} /> Talk
                        </Link>
                      )}
                    </div>
                    <p className="text-[15px] text-ink-700 leading-relaxed">{r.message}</p>
                    {r.author_committed && r.responder_committed ? (
                      <p className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-forest-600"><Check size={14} /> You are both in. This is a venture now.</p>
                    ) : r.author_committed ? (
                      <p className="mt-4 text-[13px] text-ink-500">You committed. Waiting on them.</p>
                    ) : r.responder_committed ? (
                      <button onClick={handleCommit} disabled={committing} className="mt-4 bg-ink-900 hover:bg-ink-700 text-white text-[13px] px-5 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50">
                        {committing ? 'Committing…' : 'They are in. Build it together'}
                      </button>
                    ) : (
                      <button onClick={handleCommit} disabled={committing} className="mt-4 bg-surface-muted hover:bg-violet-50 text-ink-900 text-[13px] px-5 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50">
                        {committing ? 'Committing…' : 'Build it with them'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viewer view: resonate, or the state after */}
        {!isAuthor && (
          <div className="bg-surface rounded-2xl border border-surface-border shadow-card p-8">
            {myResonance ? (
              <>
                <p className="text-[15px] font-semibold text-ink-900 mb-3">You are in on this</p>
                <p className="text-[15px] text-ink-700 leading-relaxed mb-5">{myResonance.message}</p>
                {myResonance.author_committed && myResonance.responder_committed ? (
                  <p className="flex items-center gap-1.5 text-[14px] font-medium text-forest-600"><Check size={15} /> You are both in. This is a venture now.</p>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    {myResonance.conversation_id && (
                      <Link to={`/app/inbox/${myResonance.conversation_id}`} className="flex items-center gap-1.5 bg-surface-muted hover:bg-violet-50 text-ink-900 text-[13px] px-5 py-2.5 rounded-full font-medium transition-colors">
                        <MessageCircle size={14} /> Keep talking
                      </Link>
                    )}
                    {myResonance.responder_committed ? (
                      <p className="text-[13px] text-ink-500">You committed. Waiting on them.</p>
                    ) : (
                      <button onClick={handleCommit} disabled={committing} className="bg-ink-900 hover:bg-ink-700 text-white text-[13px] px-5 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50">
                        {committing ? 'Committing…' : 'I am in. Build it together'}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-ink-900 mb-2">Does this land for you?</p>
                <p className="text-[14px] text-ink-500 mb-4 leading-relaxed">
                  This is not an application. There is nothing to be accepted into. Tell them why this matters to you and a conversation opens immediately.
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Why this landed for you, and what you would bring to it."
                  className="w-full bg-surface-muted border border-surface-border rounded-lg px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors resize-none leading-relaxed"
                />
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={handleResonate}
                    disabled={message.trim().length < 20 || sending}
                    className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full font-medium text-[14px] transition-colors"
                  >
                    <Flame size={15} /> {sending ? 'Sending…' : 'I want in'}
                  </button>
                  <p className="text-[13px] text-ink-500">{message.trim().length < 20 ? `${20 - message.trim().length} more characters` : 'Ready'}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
