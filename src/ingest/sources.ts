/**
 * Official public job feeds only. Each source returns jobs in a common shape.
 */
export type RawJob = {
  source: string; sourceId: string; title: string; company: string; companyLogo: string | null;
  location: string; jobType: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship' | 'other';
  category: string; tags: string[]; salary: string; description: string;
  applyUrl: string; applyEmail: string | null; publishedAt: Date;
};
export type Source = { name: string; fetchJobs: () => Promise<RawJob[]> };

const UA = 'Babwork/1.0 (job aggregator)';

async function getJSON<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const toDate = (v: unknown): Date => {
  if (!v) return new Date();
  if (typeof v === 'number') return new Date(v * (v < 1e12 ? 1000 : 1));
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? new Date() : d;
};

export function normalizeType(raw: unknown): RawJob['jobType'] {
  const s = String(raw || '').toLowerCase().replace(/[-_\s]/g, '');
  if (s.includes('part')) return 'part_time';
  if (s.includes('intern')) return 'internship';
  if (s.includes('freelance')) return 'freelance';
  if (s.includes('contract')) return 'contract';
  if (s.includes('full')) return 'full_time';
  return 'other';
}

export function extractEmail(html: unknown): string | null {
  const m = String(html || '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? m[0] : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const remotive: Source = {
  name: 'remotive',
  async fetchJobs() {
    const data = await getJSON<{ jobs: any[] }>('https://remotive.com/api/remote-jobs?limit=200');
    return (data.jobs || []).map((j) => ({
      source: 'remotive', sourceId: String(j.id), title: j.title, company: j.company_name,
      companyLogo: j.company_logo || null, location: j.candidate_required_location || 'Remote',
      jobType: normalizeType(j.job_type), category: j.category || '', tags: Array.isArray(j.tags) ? j.tags : [],
      salary: j.salary || '', description: j.description || '', applyUrl: j.url,
      applyEmail: extractEmail(j.description), publishedAt: toDate(j.publication_date),
    }));
  },
};

export const arbeitnow: Source = {
  name: 'arbeitnow',
  async fetchJobs() {
    const data = await getJSON<{ data: any[] }>('https://www.arbeitnow.com/api/job-board-api');
    return (data.data || []).filter((j) => j.remote).map((j) => ({
      source: 'arbeitnow', sourceId: j.slug, title: j.title, company: j.company_name, companyLogo: null,
      location: j.location || 'Remote', jobType: normalizeType((j.job_types || []).join(' ')),
      category: (j.tags || [])[0] || '', tags: j.tags || [], salary: '', description: j.description || '',
      applyUrl: j.url, applyEmail: extractEmail(j.description), publishedAt: toDate(j.created_at),
    }));
  },
};

export const jobicy: Source = {
  name: 'jobicy',
  async fetchJobs() {
    const data = await getJSON<{ jobs: any[] }>('https://jobicy.com/api/v2/remote-jobs?count=100');
    return (data.jobs || []).map((j) => {
      const salary = j.annualSalaryMin || j.annualSalaryMax
        ? `${j.salaryCurrency || ''} ${j.annualSalaryMin || ''}${j.annualSalaryMax ? ' – ' + j.annualSalaryMax : ''}`.trim() : '';
      return {
        source: 'jobicy', sourceId: String(j.id), title: j.jobTitle, company: j.companyName,
        companyLogo: j.companyLogo || null, location: j.jobGeo || 'Remote',
        jobType: normalizeType(Array.isArray(j.jobType) ? j.jobType.join(' ') : j.jobType),
        category: Array.isArray(j.jobIndustry) ? j.jobIndustry[0] || '' : j.jobIndustry || '',
        tags: ([] as string[]).concat(j.jobIndustry || [], j.jobLevel || []).filter(Boolean),
        salary, description: j.jobDescription || j.jobExcerpt || '', applyUrl: j.url,
        applyEmail: extractEmail(j.jobDescription), publishedAt: toDate(j.pubDate),
      };
    });
  },
};

export const remoteok: Source = {
  name: 'remoteok',
  async fetchJobs() {
    const data = await getJSON<any[]>('https://remoteok.com/api');
    return (Array.isArray(data) ? data : []).filter((j) => j && j.id && j.position).map((j) => ({
      source: 'remoteok', sourceId: String(j.id), title: j.position, company: j.company,
      companyLogo: j.company_logo || j.logo || null, location: j.location || 'Remote',
      jobType: normalizeType((j.tags || []).join(' ')), category: (j.tags || [])[0] || '', tags: j.tags || [],
      salary: j.salary_min || j.salary_max ? `$${j.salary_min || ''} – $${j.salary_max || ''}` : '',
      description: j.description || '', applyUrl: j.apply_url || j.url,
      applyEmail: extractEmail(j.description), publishedAt: toDate(j.epoch || j.date),
    }));
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const sources: Source[] = [remotive, arbeitnow, jobicy, remoteok];
