export type MatchingJob = {
  id: number; title: string; company: string; location: string; category: string;
  tags: string[]; description: string; salary: string;
};
export type Match = { id: number; score: number; shared: string[]; check: string[] };

export function chunkCv(text: string) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 35) {
    chunks.push(words.slice(i, i + 50).join(' '));
    if (i + 50 >= words.length) break;
  }
  // Sample across the whole CV rather than silently omitting later experience.
  return chunks.length <= 32 ? chunks : Array.from({ length: 32 }, (_, i) => chunks[Math.round(i * (chunks.length - 1) / 31)]);
}

export function jobText(job: MatchingJob) {
  return [job.title, job.category, job.tags.join(', '), job.description.split(/\s+/).slice(0, 65).join(' ')].join('. ');
}

export function cosine(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}

export function skillEvidence(text: string, tags: string[]) {
  const cv = text.normalize('NFKC').toLocaleLowerCase();
  const shared: string[] = [], check: string[] = [];
  for (const tag of [...new Set(tags)].filter(t => t.trim()).slice(0, 20)) {
    const term = tag.normalize('NFKC').toLocaleLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`(^|[^\\p{L}\\p{N}])${term}($|[^\\p{L}\\p{N}])`, 'u').test(cv);
    (found ? shared : check).push(tag);
  }
  return { shared: shared.slice(0, 6), check: check.slice(0, 4) };
}

export function rankMatches(cv: string, cvVectors: number[][], jobs: MatchingJob[], vectors: number[][]): Match[] {
  if (!cvVectors.length || jobs.length !== vectors.length) return [];
  return jobs.map((job, i) => {
    const scores = cvVectors.map(vector => cosine(vector, vectors[i]));
    const score = .7 * Math.max(...scores) + .3 * scores.reduce((sum, n) => sum + n, 0) / scores.length;
    return { id: job.id, score, ...skillEvidence(cv, job.tags) };
  }).filter(match => Number.isFinite(match.score) && match.score >= .25)
    .sort((a, b) => b.score - a.score || a.id - b.id).slice(0, 10);
}
