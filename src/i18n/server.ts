import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getVisitor } from '@/lib/visitor';
import { isLocale, localeForCountry, countryFromTimeZone, type Locale } from './config';
import { messages } from './messages';

/** 1. language the visitor picked  2. their country  3. their time zone  4. English */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get('rp_lang')?.value;
  if (isLocale(chosen)) return chosen;
  const visitor = await getVisitor();
  const country = visitor.country ?? countryFromTimeZone(visitor.tz);
  return country ? localeForCountry(country) : 'en';
});

export async function getT() {
  return messages[await getLocale()];
}
