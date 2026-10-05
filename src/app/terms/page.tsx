import { getT } from '@/i18n/server';
export async function generateMetadata() { return { title: (await getT()).meta.terms }; }
export default async function Terms() {
  const t = await getT();
  return (
    <section className="form-page">
      <h1>{t.meta.terms}</h1>
      <p className="quiet">{t.legalNote}</p>
      {t.terms.map((s) => <div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}
    </section>
  );
}
