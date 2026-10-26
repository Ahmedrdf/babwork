import { FileText, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { signature } from '@/i18n/signature';
import { discoveryMessages } from '@/i18n/discovery';

/** Code-native illustration extending the studded door in Babwork's existing mark. */
export function OpportunityDoor({ locale }: { locale: Locale }) {
  const t = signature[locale];
  return <figure className="opportunity-door">
    <div className="door-scene" aria-hidden="true">
      <div className="door-orbit door-orbit-one" /><div className="door-orbit door-orbit-two" />
      <span className="door-star door-star-one">✦</span><span className="door-star door-star-two">✧</span>
      <svg className="door-art" viewBox="0 0 440 400" focusable="false">
        <defs>
          <linearGradient id="door-light" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff7db" /><stop offset="1" stopColor="#dba951" /></linearGradient>
          <linearGradient id="door-blue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#3a86cc" /><stop offset="1" stopColor="#154b87" /></linearGradient>
        </defs>
        <ellipse cx="224" cy="366" rx="142" ry="15" fill="#061c34" opacity=".28" />
        <path d="M92 360V151a112 112 0 0 1 224 0v209z" fill="#eddbb9" />
        <path d="M105 360V151a99 99 0 0 1 198 0v209z" fill="#bd9250" />
        <path d="M116 360V151a88 88 0 0 1 176 0v209z" fill="url(#door-light)" />
        <path d="M127 349V152a77 77 0 0 1 154 0v197" fill="none" stroke="#fff9e9" strokeWidth="2" opacity=".6" />
        <path d="m170 360 91-153 29 153z" fill="#fff7dc" opacity=".45" />
        <g className="door-leaf">
          <path d="M116 360V151a88 88 0 0 1 176 0v209z" fill="url(#door-blue)" stroke="#103e72" strokeWidth="3" />
          <path d="M128 348V151a76 76 0 0 1 152 0v197z" fill="none" stroke="#8dbbdf" strokeWidth="2" opacity=".55" />
          <path d="M204 65v294" stroke="#0d3d70" strokeWidth="3" />
          {[0, 1, 2, 3, 4].map(row => <g key={row} fill="#ebd1a1">{[150, 177, 231, 258].map(x => <circle key={x} cx={x} cy={160 + row * 38} r="2.5" />)}</g>)}
          <path d="m204 101 11 14-11 14-11-14z" fill="none" stroke="#e8cf9c" strokeWidth="2" />
          {[183, 225].map(x => <g key={x}><circle cx={x} cy="221" r="4" fill="#f4d99b" /><circle cx={x} cy="231" r="8" fill="none" stroke="#f4d99b" strokeWidth="3" /></g>)}
        </g>
        <path d="M87 360h234l12 9H75z" fill="#e8d7b6" />
        <path d="M78 370h252" stroke="#b58a50" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="door-float door-cv"><span className="door-card-icon"><FileText size={21} /></span><div><strong>{t.cv}</strong><span className="door-lines"><i /><i /></span></div><span className="door-card-check">✓</span></div>
      <div className="door-float door-opportunity"><span className="door-card-icon"><ArrowUpRight size={21} /></span><div><strong>{t.opportunities}</strong><span className="door-lines"><i /><i /></span></div></div>
    </div>
    <figcaption><span className="door-caption-kicker">Babwork · {t.example}</span><h2>{t.title}</h2><p>{t.subtitle}</p>
      <span className="door-privacy"><ShieldCheck size={14} aria-hidden="true" />{discoveryMessages[locale].private}</span>
    </figcaption>
  </figure>;
}
