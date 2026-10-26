'use client';
import { useState } from 'react';
import { useLocale } from '@/i18n/client';
import { billingMessages, getPremiumMessages } from '@/i18n/billing';
import { isCheckoutUrl, premiumPrice, type BillingMarket } from '@/lib/premium';

export function PaymentForm({ market, renew = false }: { market: BillingMarket; renew?: boolean }) {
  const locale = useLocale();
  const t = getPremiumMessages(locale, market);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function checkout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ market }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.checkoutError);
      if (!isCheckoutUrl(data.url, market)) throw new Error(t.checkoutError);
      window.location.assign(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.checkoutError); setBusy(false);
    }
  }
  return <div>
    <button className="btn" type="button" disabled={busy} onClick={checkout}>{busy ? t.loading : renew ? `${billingMessages[locale].renew} — ${premiumPrice(market, locale)}` : t.subscribe}</button>
    {error && <p className="err" role="alert">{error}</p>}
  </div>;
}
