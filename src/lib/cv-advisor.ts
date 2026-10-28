import type { Locale } from '@/i18n/config';
import { skillEvidence, type MatchingJob } from './cv-matching';
import { cvAdviceTemplates } from '@/i18n/cv-advisor';

export type AdviceRequest = { cv: string; job: MatchingJob; locale: Locale };

export type AdviceTip = { id: string; title: string; body: string };

export function adviceTips(request: AdviceRequest): AdviceTip[] {
  const t = cvAdviceTemplates[request.locale];
  const skills = request.job.tags.slice(0, 16).map(tag => adviceExcerpt(tag, 60));
  const { shared, check } = skillEvidence(request.cv, skills);
  return [
    { id: 'experience', title: t.experienceTitle, body: shared.length ? t.experience(shared.join(', ')) : t.experienceFallback },
    { id: 'keywords', title: t.keywordsTitle, body: check.length ? t.keywords(check.join(', ')) : t.keywordsFallback },
    { id: 'summary', title: t.summaryTitle, body: t.summary(adviceExcerpt(request.job.title, 180)) },
  ];
}

export function adviceText(tips: AdviceTip[]) {
  return tips.map((tip, index) => `${index + 1}. ${tip.title}\n${tip.body}`).join('\n\n');
}

// Bound labels taken from job listings before inserting them into suggestions.
export function adviceExcerpt(text: string, limit: number): string {
  const clean = text.replace(/<\|[^>]*\|>/g, '').replace(/\u0000/g, '').trim();
  if (clean.length <= limit) return clean;
  const half = Math.floor((limit - 5) / 2);
  return `${clean.slice(0, half)}\n…\n${clean.slice(-half)}`;
}

