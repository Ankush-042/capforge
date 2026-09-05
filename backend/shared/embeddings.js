/**
 * Real semantic embeddings via a local, open-source model
 * (Xenova/all-MiniLM-L6-v2, 384 dimensions) — runs entirely in Node,
 * no external API key or network call needed at inference time. This
 * closes the embedding deferral flagged all the way back in Sprint 2.
 *
 * The model downloads once (from Hugging Face's CDN) on first use and
 * is cached locally afterward.
 *
 * REAL BUG FOUND: on first use, if the model download stalls (slow/
 * blocked network), this could hang indefinitely with zero output,
 * appearing as a complete freeze. Every call now has a hard timeout —
 * it fails loudly and clearly instead of hanging silently forever.
 */
const EMBEDDING_TIMEOUT_MS = 60000; // 60s — generous for a slow first-time download, but finite

let embedderPromise = null;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ]);
}

async function getEmbedder() {
  if (!embedderPromise) {
    console.log('Loading local embedding model (first use only — downloads once, then cached)...');
    embedderPromise = withTimeout(
      (async () => {
        const { pipeline } = await import('@xenova/transformers');
        return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      })(),
      EMBEDDING_TIMEOUT_MS,
      'Embedding model download/load'
    ).catch(err => {
      embedderPromise = null; // allow retry on a future call instead of permanently caching a failure
      throw err;
    });
  }
  return embedderPromise;
}

/**
 * @param {string} text
 * @returns {Promise<number[]|null>} a 384-dimension real semantic embedding, or null on failure/timeout
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;
  try {
    const embedder = await getEmbedder();
    const output = await withTimeout(embedder(text, { pooling: 'mean', normalize: true }), EMBEDDING_TIMEOUT_MS, 'Embedding inference');
    return Array.from(output.data);
  } catch (err) {
    console.error('Embedding generation failed or timed out (non-fatal, caller handles gracefully):', err.message);
    return null;
  }
}

module.exports = { generateEmbedding };
