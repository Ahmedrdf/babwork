/**
 * Where a candidate can work from. Shared by the server (SQL filters) and the browser
 * (detecting the visitor's region from their time zone). A job counts for a region when its
 * location names the region or a country in it, or when it is open to everyone.
 */
export const REGION_KEYS = ['europe', 'americas', 'mea', 'apac'] as const;
export type RegionKey = (typeof REGION_KEYS)[number];
export type Tint = 'blue' | 'ochre' | 'terracotta' | 'olive';

export const REGIONS: Record<RegionKey, { label: string; city: string; timeZone: string; tint: Tint }> = {
  europe: { label: 'Europe', city: 'Paris', timeZone: 'Europe/Paris', tint: 'blue' },
  americas: { label: 'Americas', city: 'New York', timeZone: 'America/New_York', tint: 'terracotta' },
  mea: { label: 'Middle East & Africa', city: 'Dubai', timeZone: 'Asia/Dubai', tint: 'ochre' },
  apac: { label: 'Asia-Pacific', city: 'Singapore', timeZone: 'Asia/Singapore', tint: 'olive' },
};

const TERMS: Record<RegionKey, string[]> = {
  europe: ['europe', 'european', 'eu', 'emea', 'uk', 'united kingdom', 'england', 'ireland', 'france', 'germany', 'spain', 'portugal', 'italy', 'netherlands', 'belgium', 'switzerland', 'austria', 'poland', 'sweden', 'norway', 'denmark', 'finland', 'cet', 'cest', 'gmt'],
  americas: ['usa', 'us', 'united states', 'america', 'americas', 'north america', 'canada', 'latam', 'latin america', 'south america', 'mexico', 'brazil', 'argentina', 'colombia', 'est', 'pst', 'cst'],
  mea: ['emea', 'mena', 'middle east', 'africa', 'north africa', 'uae', 'dubai', 'saudi', 'qatar', 'egypt', 'morocco', 'tunisia', 'algeria', 'nigeria', 'kenya', 'south africa', 'israel', 'turkey'],
  apac: ['apac', 'asia', 'asia pacific', 'india', 'pakistan', 'bangladesh', 'philippines', 'singapore', 'malaysia', 'indonesia', 'vietnam', 'thailand', 'japan', 'korea', 'china', 'hong kong', 'taiwan', 'australia', 'new zealand'],
};
const ANYWHERE = ['worldwide', 'anywhere', 'global', 'international'];

export const isRegion = (v: unknown): v is RegionKey => typeof v === 'string' && (REGION_KEYS as readonly string[]).includes(v);

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Postgres word boundaries are \m and \M
export const sqlPattern = (k: RegionKey) => `\\m(${TERMS[k].map(esc).join('|')})\\M`;
export const SQL_ANYWHERE = `\\m(${ANYWHERE.join('|')})\\M`;

const jsRegex = (terms: string[]) => new RegExp(`\\b(${terms.map(esc).join('|')})\\b`, 'i');
const RE = Object.fromEntries(REGION_KEYS.map((k) => [k, jsRegex(TERMS[k])])) as Record<RegionKey, RegExp>;
const RE_ANYWHERE = jsRegex(ANYWHERE);

/** Same rule as the SQL filter, for marking individual cards. */
export function isOpenTo(location: string, k: RegionKey) {
  const l = (location || '').trim();
  return !l || /^remote$/i.test(l) || RE_ANYWHERE.test(l) || RE[k].test(l);
}

const MIDDLE_EAST = /^Asia\/(Dubai|Riyadh|Qatar|Bahrain|Kuwait|Muscat|Baghdad|Tehran|Jerusalem|Tel_Aviv|Beirut|Amman|Damascus|Aden|Gaza|Hebron|Nicosia|Famagusta)$/;

/** Rough region from an IANA time zone such as "Africa/Tunis" or "Europe/Paris". */
export function regionFromTimeZone(tz: string): RegionKey | null {
  if (tz.startsWith('Europe/') || /^Atlantic\/(Canary|Madeira|Reykjavik|Faroe)$/.test(tz)) return 'europe';
  if (tz.startsWith('America/')) return 'americas';
  if (tz.startsWith('Africa/') || MIDDLE_EAST.test(tz)) return 'mea';
  if (tz.startsWith('Asia/') || tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'apac';
  return null;
}
