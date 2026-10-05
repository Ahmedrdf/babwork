'use client';
import { useTransition } from 'react';
import { setApplicationStatus } from '@/actions/account';
import { useT } from '@/i18n/client';

const STATUSES = ['applied', 'interviewing', 'rejected', 'offer'] as const;
type S = (typeof STATUSES)[number];

export function StatusSelect({ id, status }: { id: number; status: S }) {
  const t = useT().apps;
  const [pending, start] = useTransition();
  return (
    <select defaultValue={status} disabled={pending} aria-label={t.status} onChange={(e) => start(() => setApplicationStatus(id, e.target.value as S))}>
      {STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
    </select>
  );
}
