import { Check, FileText, ScanSearch, Compass } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { signature } from '@/i18n/signature';

export function CvJourney({ locale, stage, ready, complete }: { locale: Locale; stage: string; ready: boolean; complete: boolean }) {
  const t = signature[locale];
  const current = complete ? 2 : stage === 'reading' || !ready ? 0 : 1;
  const working = !!stage;
  const steps = [[FileText, t.read, t.readHint], [ScanSearch, t.compare, t.compareHint], [Compass, t.discover, t.discoverHint]] as const;
  return <ol className={`cv-journey${working ? ' is-working' : ''}`} aria-label={t.journey}>
    {steps.map(([Icon, title, hint], index) => {
      const done = index < current || complete;
      return <li key={title} className={done ? 'is-done' : current === index ? 'is-current' : ''} aria-current={current === index ? 'step' : undefined}>
        <span className="journey-icon" aria-hidden="true">{done ? <Check size={21} /> : <Icon size={21} />}</span>
        <div><span className="journey-number" aria-hidden="true">0{index + 1}</span><strong>{title}</strong><small>{hint}</small></div>
      </li>;
    })}
  </ol>;
}
