'use client';
import { useEffect } from 'react';
import { markViewed } from '@/actions/account';

/** Marks the job as viewed once the page is shown in the browser (not on link prefetch). */
export function TrackView({ jobId }: { jobId: number }) {
  useEffect(() => { markViewed(jobId).catch(() => {}); }, [jobId]);
  return null;
}
