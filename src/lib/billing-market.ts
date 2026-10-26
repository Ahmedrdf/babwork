import 'server-only';
import { cookies } from 'next/headers';
import { getVisitor } from './visitor';
import { countryFromTimeZone } from '@/i18n/config';
import { isBillingMarket, type BillingMarket } from './premium';
import { env } from './env';

export async function getBillingMarket(selected?: string): Promise<BillingMarket> {
  if (isBillingMarket(selected)) return selected;
  const saved = (await cookies()).get('bw_billing_market')?.value;
  if (isBillingMarket(saved)) return saved;
  const visitor = await getVisitor();
  const country = visitor.country ?? countryFromTimeZone(visitor.tz);
  if (country) return country === 'TN' ? 'TN' : 'INTL';
  if (visitor.tz) return 'INTL';
  return process.env.BILLING_DEFAULT_MARKET === 'INTL' ? 'INTL' : 'TN';
}

export function paymentAvailable(market: BillingMarket) {
  return market === 'TN' ? env.konnectPaymentsEnabled : env.paymentsEnabled;
}
