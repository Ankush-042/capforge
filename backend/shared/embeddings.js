/**
 * Real semantic embeddings via a local, open-source model
 * (Xenova/all-MiniLM-L6-v2, 384 dimensions) — runs entirely in Node,
 * no external API key or network call needed at inference time. This
 * closes the embedding deferral flagged all the way back in Sprint 2.
 *
 * The model downloads once (from Hugging Face's CDN) on first use and
 * is cached locally afterward — this happens automatically, no setup
 * required beyond having internet access the first time it runs.
 */
let embedderPromise = null;

async function getEmbedder() {
  if (!embedderPromise) {
    const { pipeline } = await import('@xenova/transformers');
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPromise;
}

/**
 * @param {string} text
 * @returns {Promise<number[]>} a 384-dimension real semantic embedding
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

module.exports = { generateEmbedding };
