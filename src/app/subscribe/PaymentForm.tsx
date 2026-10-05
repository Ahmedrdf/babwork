'use client';
import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

export function PaymentForm({ publishableKey, email, next }: { publishableKey: string; email: string; next: string }) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const [intent, setIntent] = useState<{ clientSecret: string; subscriptionId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/intent', { method: 'POST' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not start the payment.'); setIntent(d); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="err">{error}</p>;
  if (!intent) return <p className="quiet">Loading secure card form…</p>;

  const accent = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() : '#1d5c4a';
  return (
    <Elements stripe={stripePromise} options={{
      clientSecret: intent.clientSecret,
      appearance: { theme: 'stripe', variables: { colorPrimary: accent, colorText: '#16202c', borderRadius: '6px', fontFamily: 'Figtree, "Segoe UI", system-ui, sans-serif' } },
    }}>
      <Inner email={email} subscriptionId={intent.subscriptionId} next={next} />
    </Elements>
  );
}

function Inner({ email, subscriptionId, next }: { email: string; subscriptionId: string; next: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${location.origin}/api/billing/success?subscription=${encodeURIComponent(subscriptionId)}&next=${encodeURIComponent(next)}`,
        receipt_email: email,
      },
    });
    if (error) { setError(error.message || 'The payment could not be completed.'); setBusy(false); }
  }

  return (
    <form id="pay-form" onSubmit={submit}>
      <div className="payment-element"><PaymentElement options={{ layout: 'tabs' }} onReady={() => setReady(true)} /></div>
      <button className="btn" type="submit" disabled={!ready || busy}>{busy ? 'Processing…' : 'Subscribe for €9 / month'}</button>
      {error && <p className="err">{error}</p>}
      <p className="hint">Card details go straight to Stripe and never touch our server. Cancel any time from this page.</p>
    </form>
  );
}
