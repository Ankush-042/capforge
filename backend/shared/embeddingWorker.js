/**
 * Runs on a genuinely separate OS thread (Node worker_threads) — this
 * is the real, correct fix for the freeze bug: "fire-and-forget" async
 * code still blocks Node's single main thread if the underlying work
 * does synchronous CPU computation (which ONNX/WASM model loading
 * does). A worker thread physically cannot block the main server,
 * regardless of how long model loading/inference takes.
 */
const { parentPort } = require('worker_threads');

let embedderPromise = null;
async function getEmbedder() {
  if (!embedderPromise) {
    const { pipeline } = await import('@xenova/transformers');
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPromise;
}

parentPort.on('message', async ({ id, text }) => {
  try {
    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    parentPort.postMessage({ id, success: true, embedding: Array.from(output.data) });
  } catch (err) {
    parentPort.postMessage({ id, success: false, error: err.message });
  }
});
