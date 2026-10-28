'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { premiumMessages } from '@/i18n/premium';
import { REGION_KEYS } from '@/lib/regions';
import type { Match, MatchingJob } from '@/lib/cv-matching';
import { improvements } from '@/i18n/improvements';
import { MatchFeedback } from '@/components/Community';
import { CvJourney } from '@/components/CvJourney';
import { CvAdvisor } from './CvAdvisor';
import { CvPreview } from './CvPreview';

type Result = Match & { job: MatchingJob };
type WorkerReply = { status: 'loadingModel' | 'ranking' | 'complete' | 'error'; done?: number; total?: number; matches?: Match[]; file?: string; loaded?: number; bytes?: number };

export function Matcher({ savedCvName, trial = false, showPricing = false }: { savedCvName: string | null; trial?: boolean; showPricing?: boolean }) {
  const locale = useLocale();
  const t = premiumMessages[locale];
  const extra = improvements[locale];
  const regions = useT().regions;
  const worker = useRef<Worker | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [cv, setCv] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [region, setRegion] = useState('');
  const [stage, setStage] = useState<'' | 'reading' | 'loadingModel' | 'ranking'>('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [download, setDownload] = useState({ file: '', loaded: 0, bytes: 0 });
  const [trialUsed, setTrialUsed] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState(false);
  const completion = useRef<{ permit: string; results: Result[]; total: number } | null>(null);
  const busy = stage !== '';

  useEffect(() => () => { worker.current?.terminate(); abort.current?.abort(); }, []);

  async function read(file: File) {
    setStage('reading'); setError(''); setResults(null);
    try {
      const { readCv } = await import('@/lib/read-cv');
      const text = await readCv(file);
      setCv(text); setPreviewFile(file);
    }
    catch (error) {
      const code = error instanceof Error ? error.message : '';
      setError(code === 'invalidFile' ? t.invalidFile : code === 'noText' ? t.noText : t.cvError);
    } finally { setStage(''); }
  }

  async function saved() {
    setStage('reading'); setError('');
    try {
      const response = await fetch('/api/profile/cv', { cache: 'no-store' });
      if (!response.ok) throw new Error(t.cvError);
      await read(new File([await response.blob()], savedCvName || 'cv.pdf'));
    } catch { setError(t.cvError); setStage(''); }
  }

  function cancel() {
    abort.current?.abort(); worker.current?.terminate(); worker.current = null;
    setStage(''); setError(''); setProgress({ done: 0, total: 0 });
  }

  async function match(event: React.FormEvent) {
    event.preventDefault();
    if (cv.trim().length < 40) { setError(t.noText); return; }
    if (trialUsed) return;
    // If the acknowledgement was lost, retry it without performing a second analysis.
    if (completion.current) { await acknowledge(); return; }
    setStage('loadingModel'); setError(''); setResults(null); setProgress({ done: 0, total: 0 }); setDownload({ file: '', loaded: 0, bytes: 0 });
    const controller = new AbortController(); abort.current = controller;
    try {
      const response = await fetch('/api/recommendations/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ region }), cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? t.accessError : t.jobError);
      const { jobs, permit } = await response.json() as { jobs: MatchingJob[]; permit: string | null };
      if (controller.signal.aborted) return;
      if (!jobs.length) { setError(t.empty); setStage(''); return; }
      worker.current ??= new Worker(new URL('./matching.worker.ts', import.meta.url), { type: 'module' });
      worker.current.onerror = () => { setError(t.modelError); setStage(''); worker.current?.terminate(); worker.current = null; };
      worker.current.onmessage = (event: MessageEvent<WorkerReply>) => {
        const data = event.data;
        if (data.status === 'error') { setError(t.modelError); setStage(''); return; }
        if (data.status === 'complete') {
          worker.current?.terminate(); worker.current = null;
          const byId = new Map(jobs.map(job => [job.id, job]));
          const matches = (data.matches || []).filter(m => byId.has(m.id)).map(m => ({ ...m, job: byId.get(m.id)! }));
          if (permit) { completion.current = { permit, results: matches, total: jobs.length }; setPendingCompletion(true); void acknowledge(); return; }
          setResults(matches);
          setProgress({ done: jobs.length, total: jobs.length }); setStage('');
        } else {
          setStage(data.status); setProgress({ done: data.done || 0, total: data.total || 0 });
          if (data.file) setDownload({ file: data.file, loaded: data.loaded || 0, bytes: data.bytes || 0 });
        }
      };
      worker.current.postMessage({ cv: cv.trim(), jobs });
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : t.modelError); setStage('');
    }
  }

  async function acknowledge() {
    const pending = completion.current;
    if (!pending) return;
    setStage('ranking'); setError('');
    try {
      const response = await fetch('/api/recommendations/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complete: pending.permit }) });
      if (!response.ok) throw new Error('completion');
      if (!(await response.json()).ok) {
        // An expired permit has not used the trial; allow a fresh attempt.
        completion.current = null; setPendingCompletion(false); throw new Error('expired');
      }
      setResults(pending.results); setProgress({ done: pending.total, total: pending.total }); setTrialUsed(true); completion.current = null; setPendingCompletion(false);
    } catch { setError(extra.failed); }
    finally { setStage(''); }
  }

  return <>
    <div className="matching-notice"><p>{t.privacy}</p><p className="hint">{t.download}</p></div>
    <CvJourney locale={locale} stage={stage} ready={cv.trim().length >= 40} complete={results !== null} />
    <div className={`matching-workspace${previewFile ? ' has-preview' : ''}`}>
    <form className="matching-form plan-card" onSubmit={match}>
      <label>{t.upload}<input type="file" accept=".pdf,.docx,.txt" disabled={busy || trialUsed || pendingCompletion} onChange={event => {
        const file = event.currentTarget.files?.[0]; if (file) void read(file); event.currentTarget.value = '';
      }} /></label>
      {savedCvName && <button className="linkish" type="button" disabled={busy || trialUsed || pendingCompletion} onClick={saved}>{t.saved} ({savedCvName})</button>}
      <label>{t.paste}<textarea rows={7} dir="auto" maxLength={20000} value={cv} disabled={busy || trialUsed || pendingCompletion} onChange={event => {
        setCv(event.target.value); setResults(null); setError('');
      }} /><small>{t.textHint}</small></label>
      <label>{t.region}<select value={region} disabled={busy || trialUsed} onChange={event => { setRegion(event.target.value); setResults(null); }}>
        <option value="">{t.allRegions}</option><option value="TN">{extra.tunisia}</option>{REGION_KEYS.map(key => <option key={key} value={key}>{regions[key].name}</option>)}
      </select></label>
      {region === 'TN' && <p className="hint">{extra.tunisiaHint}</p>}
      {trialUsed && <div className="matching-notice"><p>{showPricing ? extra.trialUsed : extra.trialFinished}</p>{showPricing ? <Link className="btn btn-premium" href="/subscribe">Premium</Link> : <Link className="btn ghost" href="/jobs">{extra.browse}</Link>}</div>}
      <div className="matching-actions"><button className="btn" type="submit" disabled={busy || trialUsed || cv.trim().length < 40}>{trial && trialUsed ? extra.trialEnd : t.start}</button>
        {busy && stage !== 'reading' && <button className="btn ghost" type="button" onClick={cancel}>{t.cancel}</button>}</div>
      {busy && <div role="status" aria-live="polite"><p>{t[stage as 'reading' | 'loadingModel' | 'ranking']}</p>
        {stage === 'loadingModel' && download.file && <div><p className="hint">{extra.download} · {extra.file}: <bdi>{download.file}</bdi> · {(download.loaded / 1048576).toFixed(1)} / {(download.bytes / 1048576).toFixed(1)} MB</p>
          {download.bytes > 0 && <progress max={download.bytes} value={download.loaded} aria-label={`${extra.download}: ${download.file}`} />}</div>}
        {stage === 'ranking' && progress.total > 0 && <progress max={progress.total} value={progress.done} aria-label={t.ranking} />}</div>}
      {error && <p className="err" role="alert">{error}</p>}
    </form>
    {previewFile && <CvPreview file={previewFile} text={cv} />}
    </div>
    {results !== null && <section className="matching-results" aria-live="polite">
      <h2>{t.results}</h2><p className="quiet">{t.count} {progress.total}</p><p className="hint">{t.disclaimer}</p>
      {!results.length && <p className="empty">{t.noMatches}</p>}
      {results.length > 0 && <CvAdvisor key={locale} cv={cv} jobs={results.map(result => result.job)} />}
      <ol className="match-list">{results.map(({ job, shared, check }, index) => <li className="plan-card match-card" key={job.id} style={{ animationDelay: `${Math.min(index, 6) * 65}ms` }}>
        <h3><Link href={`/jobs/${job.id}`}>{job.title}</Link></h3><p className="quiet">{job.company} · {job.location}</p>
        {job.salary && <p>{job.salary}</p>}
        {shared.length ? <p><strong>{t.shared}:</strong> {shared.join(', ')}</p> : <p>{t.semantic}</p>}
        {check.length > 0 && <p className="quiet"><strong>{t.check}:</strong> {check.join(', ')}</p>}
        <Link className="btn ghost" href={`/jobs/${job.id}`}>{t.view}</Link>
        <MatchFeedback jobId={job.id} />
      </li>)}</ol>
    </section>}
  </>;
}
