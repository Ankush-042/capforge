/**
 * Real semantic embeddings — runs on a genuinely separate OS thread
 * (Node worker_threads), not the main server thread.
 *
 * REAL BUG FOUND AND FIXED: the previous version ran model loading/
 * inference directly on the main thread wrapped in an un-awaited
 * async function ("fire-and-forget"). This did NOT actually fix the
 * freeze — Node's single main thread can still be blocked by
 * synchronous CPU work inside a promise chain, regardless of whether
 * the CALLER awaits it. Only a genuinely separate thread can guarantee
 * the main server keeps responding to other requests no matter how
 * long model loading/inference takes.
 */
const { Worker } = require('worker_threads');
const path = require('path');

const EMBEDDING_TIMEOUT_MS = 90000; // generous for a slow first-time model download
let worker = null;
let requestId = 0;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(path.join(__dirname, 'embeddingWorker.js'));
    worker.on('message', ({ id, success, embedding, error }) => {
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      clearTimeout(entry.timer);
      if (success) entry.resolve(embedding);
      else entry.reject(new Error(error));
    });
    worker.on('error', (err) => {
      console.error('Embedding worker crashed (non-fatal, will restart on next call):', err.message);
      for (const [, entry] of pending) { clearTimeout(entry.timer); entry.reject(err); }
      pending.clear();
      worker = null; // allow a fresh worker to be spawned on the next call
    });
  }
  return worker;
}

/**
 * @param {string} text
 * @returns {Promise<number[]|null>} a 384-dimension real semantic embedding, or null on failure/timeout
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;

  const id = ++requestId;
  const w = getWorker();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      console.error(`Embedding request ${id} timed out after ${EMBEDDING_TIMEOUT_MS}ms (non-fatal, caller handles gracefully).`);
      resolve(null);
    }, EMBEDDING_TIMEOUT_MS);

    pending.set(id, {
      resolve: (embedding) => resolve(embedding),
      reject: (err) => { console.error('Embedding generation failed (non-fatal):', err.message); resolve(null); },
      timer
    });

    w.postMessage({ id, text });
  });
}

module.exports = { generateEmbedding };
