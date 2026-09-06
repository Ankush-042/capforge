/**
 * Real semantic embeddings — runs on a genuinely separate OS thread
 * per call (Node worker_threads, one-shot, spawned fresh every time),
 * not the main server thread, and not a reused persistent worker.
 *
 * REAL FIX HISTORY (kept honest, not hidden): a persistent worker
 * (spawned once, reused across many calls) worked on its first call
 * but hung on the second, reliably reproducible on the affected
 * machine. Spawning a fresh worker per call sidesteps that specific
 * failure mode entirely — each worker does exactly one piece of work
 * and is terminated immediately after, so there is no "second call on
 * the same worker" to hang on. Slower per-call (model reloads every
 * time) but correctness took priority over speed here.
 */
const { Worker } = require('worker_threads');
const path = require('path');

const EMBEDDING_TIMEOUT_MS = 90000; // generous for a full model load on every call

/**
 * @param {string} text
 * @returns {Promise<number[]|null>} a 384-dimension real semantic embedding, or null on failure/timeout
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;

  // Real, immediate bypass: set SKIP_EMBEDDINGS=true in .env to disable
  // embedding generation entirely. Recommended for bulk seeding
  // scripts specifically, since fresh-worker-per-call means real
  // per-call latency that adds up fast across many rapid calls.
  if (process.env.SKIP_EMBEDDINGS === 'true') return null;

  return new Promise((resolve) => {
    let settled = false;
    const worker = new Worker(path.join(__dirname, 'embeddingWorker.js'), { workerData: { text } });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error(`Embedding request timed out after ${EMBEDDING_TIMEOUT_MS}ms (non-fatal, caller handles gracefully).`);
      worker.terminate();
      resolve(null);
    }, EMBEDDING_TIMEOUT_MS);

    worker.once('message', ({ success, embedding, error }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      if (success) resolve(embedding);
      else { console.error('Embedding generation failed (non-fatal):', error); resolve(null); }
    });

    worker.once('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error('Embedding worker crashed (non-fatal):', err.message);
      resolve(null);
    });
  });
}

module.exports = { generateEmbedding };
