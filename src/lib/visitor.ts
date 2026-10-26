import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { isRegion, regionFromCountry, type RegionKey } from './regions';
import { isValidTimeZone } from './time';

/** Country from the hosting platform's geolocation headers, when there is one. */
function countryFromHeaders(h: Headers): string | null {
  for (const k of ['x-country', 'x-vercel-ip-country', 'cf-ipcountry']) {
    const v = h.get(k);
    if (v && /^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  }
  const geo = h.get('x-nf-geo'); // Netlify: base64 JSON with country.code
  if (geo) {
    try {
      const code = JSON.parse(Buffer.from(geo, 'base64').toString('utf8'))?.country?.code;
      if (typeof code === 'string' && /^[A-Za-z]{2}$/.test(code)) return code.toUpperCase();
    } catch { /* ignore malformed header */ }
  }
  return null;
}

/**
 * The visitor's time zone (from the browser, via the cookie set by <RegionDetect>), country (from the host)
 * and region. The country wins for the region: Windows often reports "Lagos" for the whole UTC+1 zone,
 * so a time zone alone can put someone in Paris or Tunis in the wrong region.
 */
export const getVisitor = cache(async (): Promise<{ tz: string | null; country: string | null; region: RegionKey | null }> => {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const raw = jar.get('rp_tz')?.value;
  const decoded = raw ? decodeURIComponent(raw) : null;
  const tz = decoded && isValidTimeZone(decoded) ? decoded : null;
  const country = countryFromHeaders(h);
  const fromCookie = jar.get('rp_region')?.value;
  return { tz, country, region: regionFromCountry(country) ?? (isRegion(fromCookie) ? fromCookie : null) };
});
