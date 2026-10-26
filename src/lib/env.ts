// Central place for environment access. Missing required vars fail loudly at startup.
import { isPublicBillingUrl } from './premium';
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const env = {
  get DATABASE_URL() { return req('DATABASE_URL'); },
  get APP_URL() { return process.env.APP_URL || process.env.URL || 'http://localhost:3000'; },
  get SESSION_SECRET() { return req('SESSION_SECRET'); },
  get CRON_SECRET() { return req('CRON_SECRET'); },
  // optional integrations: features degrade gracefully when absent
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Babwork <no-reply@example.com>',
  /** Public contact address shown on the legal notice and privacy pages. */
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  get KONNECT_API_KEY() { return process.env.KONNECT_API_KEY || ''; },
  get KONNECT_WALLET_ID() { return process.env.KONNECT_WALLET_ID || ''; },
  get KONNECT_MODE(): 'sandbox' | 'live' { return process.env.KONNECT_MODE === 'live' ? 'live' : 'sandbox'; },
  get konnectPaymentsEnabled() {
    return !this.freeLaunchEnabled && process.env.PAYMENTS_ENABLED === '1' && !!this.KONNECT_API_KEY && /^[a-f0-9]{24}$/i.test(this.KONNECT_WALLET_ID)
      && isPublicBillingUrl(this.APP_URL) && (!this.isProd || this.KONNECT_MODE === 'live');
  },
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET: process.env.R2_BUCKET || '',
  get stripeEnabled() { return !!(this.STRIPE_SECRET_KEY && this.STRIPE_PRICE_ID); },
  get storageEnabled() { return !!(this.R2_ACCOUNT_ID && this.R2_ACCESS_KEY_ID && this.R2_SECRET_ACCESS_KEY && this.R2_BUCKET); },
  /** Paid features are off unless PAYMENTS_ENABLED=1 and Stripe is configured. */
  get paymentsEnabled() { return !this.freeLaunchEnabled && process.env.PAYMENTS_ENABLED === '1' && this.stripeEnabled && !!this.STRIPE_WEBHOOK_SECRET; },
  /** Free launch applies in production too; no account or subscription data is changed. */
  get freeLaunchEnabled() { return process.env.FREE_LAUNCH !== '0'; },
  /** Local CV matching preview; this flag can never grant production access. */
  get cvMatchingPreviewEnabled() { return process.env.NODE_ENV === 'development' && process.env.CV_MATCHING_PREVIEW === '1'; },
  get mailEnabled() { return !!this.RESEND_API_KEY; },
  /** Keep pricing unpublished until the owner explicitly enables it. */
  get pricingVisible() { return !this.freeLaunchEnabled && process.env.PRICING_VISIBLE === '1'; },
  get isProd() { return process.env.NODE_ENV === 'production'; },
};
