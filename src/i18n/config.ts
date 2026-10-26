export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

/** Tags used for dates and numbers. Arabic keeps Latin digits, like salaries and times in the listings. */
export const INTL: Record<Locale, string> = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-u-nu-latn' };
export const DIR: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', fr: 'ltr', ar: 'rtl' };
export const LANGUAGE_NAMES: Record<Locale, string> = { en: 'English', fr: 'Français', ar: 'العربية' };

// The 22 member states of the Arab League
const ARAB_COUNTRIES = new Set(['DZ', 'BH', 'KM', 'DJ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MR', 'MA', 'OM', 'PS', 'QA', 'SA', 'SO', 'SD', 'SY', 'TN', 'AE', 'YE']);

/** France and Tunisia → French, other Arab countries → Arabic, elsewhere → English. */
export function localeForCountry(country: string): Locale {
  const c = country.toUpperCase();
  if (c === 'FR' || c === 'TN') return 'fr';
  if (ARAB_COUNTRIES.has(c)) return 'ar';
  return 'en';
}

// Fallback when the host gives no country: the browser's time zone (only the zones the rule needs)
const TZ_COUNTRY: Record<string, string> = {
  'Europe/Paris': 'FR', 'America/Guadeloupe': 'FR', 'America/Martinique': 'FR', 'America/Cayenne': 'FR', 'Indian/Reunion': 'FR',
  'Indian/Mayotte': 'FR', 'America/Miquelon': 'FR', 'Pacific/Noumea': 'FR', 'Pacific/Tahiti': 'FR',
  'Africa/Algiers': 'DZ', 'Asia/Bahrain': 'BH', 'Indian/Comoro': 'KM', 'Africa/Djibouti': 'DJ', 'Africa/Cairo': 'EG', 'Asia/Baghdad': 'IQ',
  'Asia/Amman': 'JO', 'Asia/Kuwait': 'KW', 'Asia/Beirut': 'LB', 'Africa/Tripoli': 'LY', 'Africa/Nouakchott': 'MR', 'Africa/Casablanca': 'MA',
  'Asia/Muscat': 'OM', 'Asia/Gaza': 'PS', 'Asia/Hebron': 'PS', 'Asia/Qatar': 'QA', 'Asia/Riyadh': 'SA', 'Africa/Mogadishu': 'SO',
  'Africa/Khartoum': 'SD', 'Asia/Damascus': 'SY', 'Africa/Tunis': 'TN', 'Asia/Dubai': 'AE', 'Asia/Aden': 'YE',
};
export const countryFromTimeZone = (tz: string | null) => (tz ? TZ_COUNTRY[tz] ?? null : null);
