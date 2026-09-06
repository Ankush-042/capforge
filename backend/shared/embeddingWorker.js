/**
 * One-shot embedding worker — spawned fresh for EVERY embedding
 * request, does exactly one piece of work, then the process ends.
 *
 * REAL FIX for a specific observed pattern: a PERSISTENT worker (one
 * spawned once, reused for many sequential messages) worked correctly
 * for its first request but hung on the second, every time, on the
 * affected machine — a known class of issue with ONNX-runtime-backed
 * libraries and session/state reuse across multiple inference calls
 * in the same process. A fresh worker per call sidesteps this
 * entirely: there is no second call to hang on, because each worker
 * only ever does one.
 *
 * Trade-off, stated honestly: the model reloads from scratch on every
 * single call, which is slower than a persistent worker would be if
 * it worked. Correctness over speed given the alternative was hanging
 * entirely.
 */
const { parentPort, workerData } = require('worker_threads');

(async () => {
  try {
    const { pipeline } = await import('@xenova/transformers');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await embedder(workerData.text, { pooling: 'mean', normalize: true });
    parentPort.postMessage({ success: true, embedding: Array.from(output.data) });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
  }
})();
