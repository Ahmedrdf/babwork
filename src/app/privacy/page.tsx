import { getT } from '@/i18n/server';
import { contactEmail } from '@/lib/legal';
import { getLocale } from '@/i18n/server';
import { getPremiumMessages } from '@/i18n/billing';
import { getBillingMarket } from '@/lib/billing-market';
import { improvements } from '@/i18n/improvements';
export async function generateMetadata() { return { title: (await getT()).meta.privacy }; }
export default async function Privacy() {
  const t = await getT();
  const premium = getPremiumMessages(await getLocale(), await getBillingMarket());
  const email = contactEmail(); // from CONTACT_EMAIL
  const [before, after] = t.privacyContact(email).split(email);
  return (
    <section className="form-page">
      <h1>{t.meta.privacy}</h1>
      <p className="quiet">{t.legalNote}</p>
      {t.privacy.map((s) => <div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}
      <h2>{premium.privacyTitle}</h2><p>{premium.privacyDetails}</p>
      <p>{premium.billingPrivacy}</p>
      <p>{improvements[await getLocale()].communityPrivacy}</p>
      <p>{before}{email.includes('@') ? <a href={`mailto:${email}`}>{email}</a> : email}{after}</p>
    </section>
  );
}
