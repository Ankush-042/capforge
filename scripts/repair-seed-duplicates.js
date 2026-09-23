require('dotenv').config();
/**
 * Repair what seed-history.js duplicated.
 *
 * WHAT WENT WRONG. seed-history.js was described as safe to re-run. Its
 * backdating phase is; its content phase is not. Each run picks NEW targets
 * and writes the same scripted text again, so a second run produced six
 * conversations sharing one identical twelve-message exchange, four investor
 * conversations sharing one opener, the same two resonances on two different
 * sparks, and the same rewrite paragraph on two ideas. One investor said the
 * same sentence word for word to two different founders.
 *
 * Worse, the second run's messages were inserted into conversations that had
 * ALREADY been backdated, so they fell outside the backdating window and were
 * never given a rhythm: twelve messages a millisecond apart, all stamped now.
 *
 * WHAT THIS DOES. It does not delete the extra content, because more
 * conversation is not the problem; identical conversation is. Every duplicate
 * beyond the first is rewritten with different words in the same shape, and
 * every burst of messages is given a real timeline. The resonances the second
 * run created on old sparks are moved back to before the conversation they
 * opened, and the notifications about them follow.
 *
 * IT REFUSES TO GUESS. Before rewriting any exchange it verifies that all
 * twelve messages match the template exactly. If even one differs, that
 * conversation is reported and left completely alone, because a partial match
 * means something is not what this script thinks it is.
 *
 * Idempotent by construction: it only acts on text that matches the ORIGINAL
 * templates, and the rewrites deliberately share none of it. A second run
 * finds nothing left to do.
 *
 * Usage:
 *   node scripts/repair-seed-duplicates.js --dry
 *   node scripts/repair-seed-duplicates.js
 */
const pool = require('../backend/shared/db');
const T = require('./lib/seed-templates');

const DRY = process.argv.includes('--dry');
const KEEP_DEEP = 3;      // conversations allowed to carry the original script
const KEEP_INVESTOR = 2;
const HOUR = 3600000, DAY = 24 * HOUR, NOW = Date.now();
const rand = (a, b) => a + Math.random() * (b - a);
const iso = (ms) => new Date(ms).toISOString();
const ms = (t) => new Date(t).getTime();
const step = (s) => console.log(`\n${s}\n${'-'.repeat(s.length)}`);

function layout(start, gaps, latest = NOW - HOUR) {
  const total = gaps.reduce((a, b) => a + b, 0);
  let s = start, scale = 1;
  if (s + total > latest) {
    if (s >= latest) s = latest - total;
    if (s + total > latest) scale = Math.max(0.05, (latest - s) / total);
  }
  const out = [s];
  for (const g of gaps) out.push(out[out.length - 1] + g * scale);
  return out;
}

/** Re-stamp a conversation's messages and keep the conversation row in step. */
async function retime(conversationId, times, msgs, teamFormedAt) {
  for (const [i, m] of msgs.entries()) {
    const readAt = i < msgs.length - 1 ? iso(Math.min(times[i] + rand(0.2, 6) * HOUR, NOW - 60000)) : null;
    await pool.query(`UPDATE messages SET created_at = $2, read_at = $3 WHERE id = $1`, [m.id, iso(times[i]), readAt]);
  }
  const last = times[times.length - 1];
  const formed = teamFormedAt && ms(teamFormedAt) < last
    ? iso(Math.min(last + rand(1, 8) * HOUR, NOW - 30 * 60000)) : null;
  await pool.query(
    `UPDATE conversations SET created_at = $2, last_message_at = $3,
            team_formed_at = COALESCE($4, team_formed_at) WHERE id = $1`,
    [conversationId, iso(times[0]), iso(last), formed]
  );
  // The notification about this thread should not predate its last message.
  await pool.query(
    `UPDATE notifications SET created_at = $2, is_read = $3
     WHERE reference_type = 'conversation' AND reference_id = $1`,
    [conversationId, iso(last), last < NOW - 2 * DAY]
  );
}

(async () => {
  if (DRY) console.log('DRY RUN. Nothing will be written.\n');
  let rewritten = 0, retimed = 0, refused = 0;

  // ==========================================================================
  step('Deep conversations: same twelve messages in six places');

  const deepConvos = (await pool.query(
    `SELECT c.id, c.team_formed_at, COALESCE(s.name, 'this venture') AS venture
     FROM conversations c
     LEFT JOIN startups s ON s.id = c.startup_id
     WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE $1)
     ORDER BY c.id`,
    [T.FIND.deepOpener]
  )).rows;

  console.log(`  ${deepConvos.length} conversation(s) carry the scripted exchange; ${KEEP_DEEP} may keep it`);

  let variantIndex = 0;
  for (const [n, c] of deepConvos.entries()) {
    const msgs = (await pool.query(
      `SELECT id, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at, id`, [c.id]
    )).rows;
    const startIdx = msgs.findIndex((m) => m.content.startsWith('Following up properly now that I have had time to read everything on'));
    const script = msgs.slice(startIdx, startIdx + T.DEEP_EXCHANGE.length);

    // Refuse to touch anything that is not exactly what was written.
    const expected = T.DEEP_EXCHANGE.map(([, line]) => line.replace('{venture}', c.venture));
    const intact = script.length === expected.length && script.every((m, i) => m.content === expected[i]);
    if (!intact) {
      console.log(`  REFUSED  ${c.venture}: the twelve messages are not exactly the template, leaving it untouched`);
      refused++;
      continue;
    }

    const needsWords = n >= KEEP_DEEP;
    const span = ms(script[script.length - 1].created_at) - ms(script[0].created_at);
    const needsTime = span < 60000; // inserted as a burst, never given a rhythm

    if (!needsWords && !needsTime) { console.log(`  ok       ${c.venture}: keeps the original, already paced`); continue; }

    const variant = needsWords ? T.DEEP_VARIANTS[variantIndex % T.DEEP_VARIANTS.length] : null;
    if (needsWords) variantIndex++;
    console.log(`  ${DRY ? 'would fix' : 'fixing'}  ${c.venture}: ${[needsWords && 'different words', needsTime && 'a real timeline'].filter(Boolean).join(' and ')}`);
    if (DRY) { rewritten += needsWords ? 1 : 0; retimed += needsTime ? 1 : 0; continue; }

    if (needsWords) {
      for (const [i, m] of script.entries()) {
        await pool.query(`UPDATE messages SET content = $2 WHERE id = $1`,
          [m.id, variant[i].replace('{venture}', c.venture)]);
      }
      rewritten++;
    }

    if (needsTime) {
      // Start after whatever came before the script, or weeks ago if it is the
      // whole conversation.
      const prior = startIdx > 0 ? ms(msgs[startIdx - 1].created_at) : NOW - rand(18, 28) * DAY;
      const gaps = [];
      for (let i = 0; i < msgs.length - 1; i++) {
        const isScriptGap = i >= startIdx && i < startIdx + script.length - 1;
        gaps.push(isScriptGap && (i - startIdx) === T.QUIET_AFTER ? rand(6, 8) * DAY : rand(0.4, 20) * HOUR);
      }
      const firstStart = startIdx > 0 ? ms(msgs[0].created_at) : prior + rand(2, 36) * HOUR;
      const times = layout(firstStart, gaps, NOW - 3 * HOUR);
      await retime(c.id, times, msgs, c.team_formed_at);
      retimed++;
    }
  }

  // ==========================================================================
  step('Investor conversations: one opener said four times');

  const invConvos = (await pool.query(
    `SELECT c.id, COALESCE(s.name, 'this venture') AS venture
     FROM conversations c LEFT JOIN startups s ON s.id = c.startup_id
     WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE $1)
     ORDER BY c.id`,
    [T.FIND.investorOpener]
  )).rows;

  console.log(`  ${invConvos.length} conversation(s) use the scripted pitch exchange; ${KEEP_INVESTOR} may keep it`);

  for (const [n, c] of invConvos.entries()) {
    if (n < KEEP_INVESTOR) { console.log(`  ok       ${c.venture}: keeps the original`); continue; }
    const v = T.INVESTOR_VARIANTS[(n - KEEP_INVESTOR) % T.INVESTOR_VARIANTS.length];
    console.log(`  ${DRY ? 'would rewrite' : 'rewriting'}  ${c.venture} in different words`);
    if (DRY) { rewritten++; continue; }

    const pairs = [
      [T.INVESTOR_OPENER.replace('{venture}', c.venture), v.opener.replace('{venture}', c.venture)],
      [T.FOUNDER_REPLY, v.reply],
      [T.PITCH_NOTE, v.note],
      [T.INVESTOR_AFTER, v.after],
    ];
    for (const [from, to] of pairs) {
      await pool.query(`UPDATE messages SET content = $3 WHERE conversation_id = $1 AND content = $2`, [c.id, from, to]);
    }
    rewritten++;
  }

  // ==========================================================================
  step('Sparks: the same two people saying the same two things');

  const dupRes = (await pool.query(
    `SELECT r.id, r.spark_id, r.user_id, r.message, r.conversation_id
     FROM spark_resonances r WHERE r.message = ANY($1::text[])
     ORDER BY r.spark_id, r.id`,
    [T.EXTRA_RESONANCES]
  )).rows;

  const bySpark = {};
  for (const r of dupRes) (bySpark[r.spark_id] ||= []).push(r);
  const sparkIds = Object.keys(bySpark).sort();
  console.log(`  ${sparkIds.length} spark(s) carry the scripted resonances; 1 may keep them`);

  for (const [n, sid] of sparkIds.entries()) {
    if (n === 0) { console.log('  ok       the first spark keeps them'); continue; }
    const variants = T.RESONANCE_VARIANTS[(n - 1) % T.RESONANCE_VARIANTS.length];
    console.log(`  ${DRY ? 'would rewrite' : 'rewriting'}  ${bySpark[sid].length} resonance(s) on another spark`);
    if (DRY) { rewritten++; continue; }
    for (const [i, r] of bySpark[sid].entries()) {
      const to = variants[i % variants.length];
      await pool.query(`UPDATE spark_resonances SET message = $2 WHERE id = $1`, [r.id, to]);
      if (r.conversation_id) {
        await pool.query(
          `UPDATE messages SET content = $3 WHERE conversation_id = $1 AND content = $2 AND sender_id = $4`,
          [r.conversation_id, r.message, to, r.user_id]
        );
      }
    }
    rewritten++;
  }

  // ==========================================================================
  step('Sparks: the same rewrite paragraph on two ideas');

  const rewrittenSparks = (await pool.query(
    `SELECT s.id, s.the_idea FROM sparks s WHERE s.the_idea LIKE $1 ORDER BY s.id`,
    [T.FIND.rewriteSuffix]
  )).rows;
  console.log(`  ${rewrittenSparks.length} spark(s) carry it; 1 may keep it`);

  for (const [n, s] of rewrittenSparks.entries()) {
    if (n === 0) { console.log('  ok       the first keeps it'); continue; }
    const variant = T.REWRITE_VARIANTS[(n - 1) % T.REWRITE_VARIANTS.length];
    console.log(`  ${DRY ? 'would rewrite' : 'rewriting'}  the closing paragraph of another idea`);
    if (DRY) { rewritten++; continue; }
    if (!s.the_idea.includes(T.REWRITE_SUFFIX)) {
      console.log('  REFUSED  the paragraph is not exactly the template, leaving it alone');
      refused++;
      continue;
    }
    await pool.query(`UPDATE sparks SET the_idea = $2 WHERE id = $1`,
      [s.id, s.the_idea.replace(T.REWRITE_SUFFIX, variant)]);
    rewritten++;
  }

  // ==========================================================================
  step('Resonances that arrived after the conversation they started');

  // The second run added resonances to sparks that were already weeks old, and
  // their conversations were then backdated independently. The result is a
  // conversation that begins before the message that opened it.
  const stray = (await pool.query(
    `SELECT r.id, r.message, r.user_id, r.conversation_id, r.created_at,
            r.spark_id, s.created_at AS spark_at, c.team_formed_at
     FROM spark_resonances r
     JOIN sparks s ON s.id = r.spark_id
     JOIN conversations c ON c.id = r.conversation_id
     JOIN users u ON u.id = s.author_id
     WHERE r.conversation_id IS NOT NULL AND u.email LIKE '%@seed.test'`
  )).rows;

  let fixedOrder = 0;
  const touchedSparks = new Set();

  for (const r of stray) {
    const msgs = (await pool.query(
      `SELECT id, content, sender_id, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at, id`,
      [r.conversation_id]
    )).rows;
    const idx = msgs.findIndex((m) => m.sender_id === r.user_id && m.content === r.message);
    if (idx === -1) continue; // its message has been rewritten or is elsewhere

    const sparkAt = ms(r.spark_at);
    const openerAt = ms(msgs[idx].created_at);
    const earliestSensible = sparkAt + 30 * 60000;
    const needsShift = openerAt < earliestSensible;
    const resonanceWrong = ms(r.created_at) > openerAt || ms(r.created_at) < sparkAt;
    if (!needsShift && !resonanceWrong) continue;

    console.log(`  ${DRY ? 'would fix' : 'fixing'}  a resonance that ${needsShift ? 'opened a conversation dated before its own spark' : 'was stamped after the message it sent'}`);
    if (DRY) { fixedOrder++; continue; }

    let newOpenerAt = openerAt;
    if (needsShift) {
      const target = sparkAt + rand(6, 30) * HOUR;
      const gaps = msgs.slice(1).map((m, i) => Math.max(20 * 60000, ms(msgs[i + 1].created_at) - ms(msgs[i].created_at)));
      const offsetBefore = openerAt - ms(msgs[0].created_at);
      const times = layout(target - offsetBefore, gaps, NOW - 2 * HOUR);
      await retime(r.conversation_id, times, msgs, r.team_formed_at);
      newOpenerAt = times[idx];
    }
    await pool.query(`UPDATE spark_resonances SET created_at = $2 WHERE id = $1`,
      [r.id, iso(Math.max(sparkAt + 60000, newOpenerAt - 60000))]);
    touchedSparks.add(r.spark_id);
    fixedOrder++;
  }

  // Notifications about those resonances follow them.
  if (!DRY) {
    for (const sid of touchedSparks) {
      const latest = (await pool.query(`SELECT MAX(created_at) AS t FROM spark_resonances WHERE spark_id = $1`, [sid])).rows[0]?.t;
      if (!latest) continue;
      await pool.query(
        `UPDATE notifications SET created_at = $2, is_read = $3
         WHERE reference_type = 'SPARK' AND reference_id = $1 AND type = 'SPARK_RESONANCE'`,
        [sid, latest, ms(latest) < NOW - 2 * DAY]
      );
    }
  }
  console.log(`  ${fixedOrder} fixed`);

  // ==========================================================================
  console.log(`\n${'='.repeat(64)}`);
  console.log(DRY ? 'Dry run complete. Nothing was written.' : 'Done.');
  console.log(`  rewritten in different words: ${rewritten}`);
  console.log(`  given a real timeline:        ${retimed}`);
  console.log(`  resonance ordering fixed:     ${fixedOrder}`);
  if (refused > 0) console.log(`  refused to touch:             ${refused} (did not match the template exactly)`);
  await pool.end();
  process.exit(0);
})().catch((err) => { console.error('\nFailed:', err.message); console.error(err.stack); process.exit(1); });
