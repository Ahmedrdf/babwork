'use client';
import { useId, useState } from 'react';
import { useLocale } from '@/i18n/client';
import { cvAdvisorMessages } from '@/i18n/cv-advisor';
import { adviceTips, adviceText } from '@/lib/cv-advisor';
import type { MatchingJob } from '@/lib/cv-matching';

export function CvAdvisor({ cv, jobs }: { cv: string; jobs: MatchingJob[] }) {
  const locale = useLocale();
  const t = cvAdvisorMessages[locale];
  const titleId = useId();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? 0);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const job = jobs.find(row => row.id === jobId);
  const text = job ? adviceText(adviceTips({ cv, job, locale })) : '';

  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  }

  return <section className="cv-advisor plan-card" aria-labelledby={titleId}>
    <h3 id={titleId}>{t.title}</h3>
    <p>{t.intro}</p>
    <label>{t.job}<select value={jobId} onChange={event => { setJobId(Number(event.target.value)); setCopyState('idle'); }}>
      {jobs.map(row => <option key={row.id} value={row.id}>{row.title} — {row.company}</option>)}
    </select></label>
    {text && <div className="cv-advisor-output">
      <h4>{t.baseline}</h4>
      <div className="cv-advisor-text" dir="auto">{text}</div>
      <p className="hint">{t.review}</p>
      <button type="button" className="btn ghost" onClick={copy}>{t.copy}</button>
      {copyState !== 'idle' && <p role="status">{copyState === 'copied' ? t.copied : t.copyFailed}</p>}
    </div>}
  </section>;
}
