import { getT } from '@/i18n/server';
export async function generateMetadata() { return { title: (await getT()).meta.privacy }; }
export default async function Privacy() {
  const t = await getT();
  return (
    <section className="form-page">
      <h1>{t.meta.privacy}</h1>
      <p className="quiet">{t.legalNote}</p>
      {t.privacy.map((s) => <div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}
    </section>
  );
}
