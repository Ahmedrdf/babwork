import { pipeline, env, type Tensor } from '@huggingface/transformers';
import { chunkCv, jobText, rankMatches, type MatchingJob } from '@/lib/cv-matching';

env.allowLocalModels = false;
env.useBrowserCache = true;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = '/ai-runtime/';
}
type Extractor = (texts: string[], options: { pooling: 'mean'; normalize: boolean }) => Promise<Tensor>;
// A narrow signature avoids instantiating the library's union of every pipeline task.
type DownloadProgress = { status: string; file?: string; loaded?: number; total?: number };
const loadExtractor = pipeline as unknown as (task: 'feature-extraction', model: string, options: { dtype: 'q8'; device: 'wasm'; progress_callback: (progress: DownloadProgress) => void }) => Promise<Extractor>;
let model: Promise<Extractor> | undefined;
const cachedJobs = new Map<string, number[]>();

self.onmessage = async (event: MessageEvent<{ cv: string; jobs: MatchingJob[] }>) => {
  const { cv, jobs } = event.data;
  try {
    self.postMessage({ status: 'loadingModel' });
    model ??= loadExtractor('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8', device: 'wasm', progress_callback(progress) {
      if (progress.status === 'progress' && progress.file && progress.total) self.postMessage({ status: 'loadingModel', file: progress.file, loaded: progress.loaded, bytes: progress.total });
    } });
    const extractor = await model;
    const embed = async (texts: string[]) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist() as number[][];
    self.postMessage({ status: 'ranking', done: 0, total: jobs.length });
    const chunks = chunkCv(cv);
    const cvVectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 4) cvVectors.push(...await embed(chunks.slice(i, i + 4)));
    const vectors: number[][] = [];
    for (let i = 0; i < jobs.length; i += 4) {
      const batch = jobs.slice(i, i + 4);
      const texts = batch.map(jobText);
      const missing = texts.filter(text => !cachedJobs.has(text));
      if (missing.length) (await embed(missing)).forEach((vector, index) => cachedJobs.set(missing[index], vector));
      vectors.push(...texts.map(text => cachedJobs.get(text)!));
      self.postMessage({ status: 'ranking', done: Math.min(i + 4, jobs.length), total: jobs.length });
    }
    self.postMessage({ status: 'complete', matches: rankMatches(cv, cvVectors, jobs, vectors), total: jobs.length });
  } catch {
    model = undefined;
    self.postMessage({ status: 'error' });
  }
};
