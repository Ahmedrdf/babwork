'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/i18n/client';
import { improvements } from '@/i18n/improvements';

async function save(body: object) {
  const response = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('save');
}

export function JobReport({ jobId, signedIn }: { jobId: number; signedIn: boolean }) {
  const t = improvements[useLocale()];
  const [status, setStatus] = useState('');
  return <details className="job-report"><summary>{t.report}</summary>{!signedIn ? <p><Link href={`/login?next=/jobs/${jobId}`}>{t.loginReport}</Link></p> : status === 'sent' ? <p role="status">{t.sent}</p> : <form onSubmit={async event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setStatus('busy');
    try { await save({ kind: 'report', jobId, reason: data.get('reason'), note: data.get('note') }); setStatus('sent'); } catch { setStatus('error'); }
  }}><label>{t.reason}<select name="reason">{(['expired', 'misleading', 'suspicious', 'other'] as const).map(reason => <option key={reason} value={reason}>{t[reason]}</option>)}</select></label>
    <label>{t.note}<textarea name="note" rows={3} maxLength={500} /></label><button className="btn ghost" disabled={status === 'busy'}>{t.send}</button>
    {status === 'error' && <p role="alert">{t.failed}</p>}</form>}</details>;
}

export function MatchFeedback({ jobId }: { jobId: number }) {
  const t = improvements[useLocale()];
  const [vote, setVote] = useState<boolean | null>(null);
  const [status, setStatus] = useState('');
  return <div className="match-feedback"><p>{t.feedback}</p><div className="matching-actions">{[true, false].map(helpful => <button key={String(helpful)} type="button" className="btn ghost" aria-pressed={vote === helpful} disabled={status === 'busy'} onClick={async () => {
    setStatus('busy'); try { await save({ kind: 'feedback', jobId, helpful }); setVote(helpful); setStatus('sent'); } catch { setStatus('error'); }
  }}>{helpful ? t.helpful : t.unhelpful}</button>)}</div><small role="status">{status === 'sent' ? t.thanks : status === 'error' ? t.failed : ''}</small></div>;
}
