'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { regionFromTimeZone } from '@/lib/regions';

/** On a first visit, remember the browser's time zone and region, then re-render with them. */
export function RegionDetect({ known }: { known: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (known) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (!tz) return;
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `rp_tz=${encodeURIComponent(tz)}; path=/; max-age=${maxAge}; samesite=lax`;
    document.cookie = `rp_region=${regionFromTimeZone(tz) ?? 'none'}; path=/; max-age=${maxAge}; samesite=lax`;
    router.refresh();
  }, [known, router]);
  return null;
}
