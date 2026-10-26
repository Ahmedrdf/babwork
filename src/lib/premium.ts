export const PREMIUM = { amount: 900, currency: 'eur', interval: 'month' } as const;
export const PREMIUM_TUNISIA = { amount: 9900, currency: 'TND', interval: 'month' } as const;
export type BillingMarket = 'TN' | 'INTL';

export function isBillingMarket(value: unknown): value is BillingMarket { return value === 'TN' || value === 'INTL'; }

export function isPublicBillingUrl(value: string) {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && host.includes('.') && !host.endsWith('.local') && !host.endsWith('.localhost')
      && !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
      && !host.includes(':');
  } catch { return false; }
}

export function isBillingOrigin(origin: string | null, requestUrl: string, host: string | null, appUrl: string) {
  if (!origin) return false;
  try {
    const source = new URL(origin);
    if (!['http:', 'https:'].includes(source.protocol) || source.origin !== origin) return false;
    if (source.origin === new URL(appUrl).origin) return true;
    const target = new URL(requestUrl);
    if (host) target.host = host;
    return source.origin === target.origin;
  } catch { return false; }
}

export function premiumPrice(market: BillingMarket, locale: 'en' | 'fr' | 'ar') {
  if (market === 'TN') {
    const number = new Intl.NumberFormat(locale === 'ar' ? 'ar-TN-u-nu-latn' : locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(PREMIUM_TUNISIA.amount / 1000);
    return `${number} ${locale === 'fr' ? 'DT' : locale === 'ar' ? 'د.ت' : 'TND'}`;
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(PREMIUM.amount / 100);
}

export function isCheckoutUrl(value: unknown, market: BillingMarket) {
  try {
    if (typeof value !== 'string') return false;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
    return market === 'INTL' ? url.hostname === 'checkout.stripe.com'
      : url.hostname === 'konnect.network' || url.hostname.endsWith('.konnect.network');
  } catch { return false; }
}

/** One calendar month; January 31 becomes February's last day, not March. */
export function addPremiumMonth(start: Date) {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

/** Refuse a misconfigured Stripe Price rather than charging a different amount. */
export function isPremiumPrice(price: {
  active: boolean; currency: string; unit_amount: number | null;
  recurring: { interval: string; interval_count: number; usage_type?: string } | null;
}) {
  return price.active && price.currency === PREMIUM.currency && price.unit_amount === PREMIUM.amount
    && price.recurring?.interval === PREMIUM.interval && price.recurring.interval_count === 1
    && price.recurring.usage_type !== 'metered';
}

