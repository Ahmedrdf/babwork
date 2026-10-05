import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { env } from '@/lib/env';
import { PaymentForm } from './PaymentForm';
export const metadata = { title: 'Subscribe' };

export default async function SubscribePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!env.paymentsEnabled) redirect('/jobs'); // the site is free for job seekers
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (!user) redirect(`/login?next=${encodeURIComponent(next ? `/subscribe?next=${next}` : '/subscribe')}`);
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/jobs';

  return (
    <section className="plan">
      <h1>Apply to any job with one profile</h1>
      <div className="plans plans-tight">
        <div className="plan-col"><h3>Free <small>{user.isPro ? '' : 'your plan now'}</small></h3><p className="plan-price">€0</p>
          <ul><li>Browse and search all listings</li><li>Open job details</li><li>Save jobs for later</li></ul></div>
        <div className="plan-col plan-pro"><h3>Subscriber <small>{user.isPro ? 'your plan now' : ''}</small></h3><p className="plan-price">€9 <span>/ month, cancel any time</span></p>
          <ul><li>Everything in Free</li><li>Apply with your saved profile and CV</li><li>Direct email applications</li><li>Application tracker with status</li></ul></div>
      </div>

      <div className="plan-card">
        {user.isPro ? (
          <>
            <p className="done">Your subscription is active{user.subscriptionEndsAt ? `, renews on ${user.subscriptionEndsAt.toLocaleDateString('en-GB')}` : ''}.</p>
            {env.stripeEnabled && user.stripeCustomerId && <form method="post" action="/api/billing/portal"><button className="btn ghost">Change card or cancel</button></form>}
          </>
        ) : env.stripeEnabled ? (
          <>
            <h2>Pay with card</h2>
            <p className="quiet">€9 today, then €9 every month until you cancel. Billed to {user.email}.</p>
            <PaymentForm publishableKey={env.STRIPE_PUBLISHABLE_KEY} email={user.email} next={safeNext} />
          </>
        ) : (
          <>
            <form method="post" action={`/api/billing/dev-subscribe?next=${encodeURIComponent(safeNext)}`}><button className="btn">Dev subscribe (no payment)</button></form>
            <p className="hint">Stripe is not configured. Set STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_PRICE_ID to show the card form.</p>
          </>
        )}
      </div>
    </section>
  );
}
