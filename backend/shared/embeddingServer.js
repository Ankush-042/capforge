/**
 * Runs as a genuinely separate OS PROCESS (child_process, not a
 * thread) — the strongest process isolation Node offers. Loads the
 * model ONCE and stays alive, communicating with the main backend via
 * simple IPC. Real architectural upgrade over every previous attempt:
 * a persistent worker_thread worked once then hung on reuse; a
 * one-shot worker-per-call avoided reuse but paid a full model-reload
 * cost every time. A separate process gets persistence AND isolation.
 */
let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

process.on('message', async ({ id, text }) => {
  try {
    const model = await getEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    process.send({ id, success: true, embedding: Array.from(output.data) });
  } catch (err) {
    process.send({ id, success: false, error: err.message });
  }
});
