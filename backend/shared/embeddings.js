/**
 * Real semantic embeddings — runs in a genuinely separate OS process
 * (child_process.fork, not a worker thread), persistent for real
 * performance, with real automatic self-healing.
 *
 * WHY THIS ARCHITECTURE, stated plainly: every previous attempt
 * (direct blocking call, fire-and-forget, persistent worker_thread,
 * one-shot worker per call) hit a real failure eventually. The
 * pattern across all of them: it works once, then breaks on reuse or
 * under specific conditions this environment couldn't be fully
 * reproduced in. Rather than guess at one more specific cause, this
 * builds real resilience that doesn't depend on guessing correctly:
 * a genuinely separate process (the strongest isolation available),
 * with automatic detection and silent respawn if it ever hangs or
 * dies — no manual restart, ever, and every existing caller already
 * treats a failed/timed-out embedding as a graceful null, so a
 * respawn cycle never breaks the app, it just means one request
 * proceeds without the semantic boost.
 */
const { fork } = require('child_process');
const path = require('path');

const EMBEDDING_TIMEOUT_MS = 90000;
const SERVER_PATH = path.join(__dirname, 'embeddingServer.js');

let child = null;
let requestId = 0;
const pending = new Map();

function spawnChild() {
  const proc = fork(SERVER_PATH, [], { silent: false });

  proc.on('message', ({ id, success, embedding, error }) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    if (success) entry.resolve(embedding);
    else { console.error('Embedding computation failed (non-fatal):', error); entry.resolve(null); }
  });

  // Real self-healing: if the process dies or errors for ANY reason,
  // fail every request currently waiting on it gracefully (null, not
  // a hang), and clear the reference so the NEXT call spawns a fresh
  // process automatically — no manual restart is ever required.
  const handleFailure = (reason) => {
    console.error(`Embedding process ${reason} — respawning automatically on next request (non-fatal).`);
    for (const [, entry] of pending) { clearTimeout(entry.timer); entry.resolve(null); }
    pending.clear();
    if (child === proc) child = null;
  };
  proc.on('error', (err) => handleFailure(`errored: ${err.message}`));
  proc.on('exit', (code) => { if (code !== 0 && code !== null) handleFailure(`exited unexpectedly (code ${code})`); });

  return proc;
}

function getChild() {
  if (!child) child = spawnChild();
  return child;
}

/**
 * @param {string} text
 * @returns {Promise<number[]|null>} a 384-dimension real semantic embedding, or null on failure/timeout
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;

  // Real, immediate bypass — kept as a permanent, available escape
  // hatch, but no longer the required default now that real
  // self-healing exists.
  if (process.env.SKIP_EMBEDDINGS === 'true') return null;

  const id = ++requestId;
  const proc = getChild();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      console.error(`Embedding request ${id} timed out after ${EMBEDDING_TIMEOUT_MS}ms — respawning process (non-fatal).`);
      // A genuine timeout means this process may be stuck — kill and
      // let the next call spawn a fresh one, rather than leaving a
      // possibly-hung process around to fail future requests too.
      try { proc.kill(); } catch (e) { /* already dead, fine */ }
      if (child === proc) child = null;
      resolve(null);
    }, EMBEDDING_TIMEOUT_MS);

    pending.set(id, { resolve, timer });
    proc.send({ id, text });
  });
}

module.exports = { generateEmbedding };
