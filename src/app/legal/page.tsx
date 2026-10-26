import Link from 'next/link';
import { getT } from '@/i18n/server';
import { PUBLISHER, HOST, contactEmail } from '@/lib/legal';

export async function generateMetadata() { return { title: (await getT()).meta.legal }; }

// Legal notice. Publisher name and address live in src/lib/legal.ts; the contact address comes from CONTACT_EMAIL.
export default async function Legal() {
  const t = await getT();
  const email = contactEmail();
  const rows: [string, React.ReactNode][] = [
    [t.legal.name, PUBLISHER.name],
    [t.legal.address, PUBLISHER.address],
    [t.legal.director, PUBLISHER.director],
    [t.legal.registration, PUBLISHER.registration],
    [t.legal.email, email.includes('@') ? <a href={`mailto:${email}`}>{email}</a> : email],
  ];
  return (
    <section className="form-page">
      <h1>{t.meta.legal}</h1>
      <p className="quiet">{t.legal.intro}</p>
      <h2>{t.legal.publisher}</h2>
      <dl className="legal-list">
        {rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <h2>{t.legal.hosting}</h2>
      <p>{t.legal.hostingText(HOST)}</p>
      {t.legal.sections.map((s) => <div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}
      <p className="quiet"><Link href="/privacy">{t.meta.privacy}</Link> · <Link href="/terms">{t.meta.terms}</Link></p>
    </section>
  );
}
