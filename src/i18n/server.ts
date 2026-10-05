import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { getVisitor } from '@/lib/visitor';
import { isLocale, localeForCountry, countryFromTimeZone, type Locale } from './config';
import { messages } from './messages';

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

/** 1. language the visitor picked  2. their country  3. their time zone  4. English */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get('rp_lang')?.value;
  if (isLocale(chosen)) return chosen;
  const country = countryFromHeaders(await headers()) ?? countryFromTimeZone((await getVisitor()).tz);
  return country ? localeForCountry(country) : 'en';
});

export async function getT() {
  return messages[await getLocale()];
}
