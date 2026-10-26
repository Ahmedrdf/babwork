import type { Locale } from './config';
import { premiumMessages } from './premium';
import { discoveryMessages } from './discovery';
import { premiumPrice, type BillingMarket } from '@/lib/premium';
import { launchMessages } from './launch';

export const billingMessages = {
  fr: {
    country: 'Pays et devise du paiement', tunisia: 'Tunisie — dinar tunisien (DT)', international: 'Autres pays — euro (EUR)', update: 'Mettre à jour',
    terms: 'Un mois d’accès. Renouvellement manuel, sans prélèvement automatique.',
    pay: 'Activer Premium pour un mois', renew: 'Prolonger Premium d’un mois',
    explanation: 'Le paiement Konnect donne accès à Premium pendant un mois. Pour continuer, vous choisissez de renouveler et effectuez un nouveau paiement. Aucun prélèvement automatique.',
    pending: 'Le paiement n’est pas encore confirmé. Aucun nouvel accès Premium n’a été activé.',
    sandbox: 'Paiement Sandbox : aucun encaissement réel. L’accès de test ne sera pas valable en production.',
    confirmed: 'Paiement confirmé. Votre accès Premium est actif.',
    privacy: 'Konnect traite les paiements en dinars. Vos coordonnées bancaires sont saisies sur sa page sécurisée. Babwork conserve les références, montants et statuts des paiements pour activer votre accès.',
  },
  en: {
    country: 'Payment country and currency', tunisia: 'Tunisia — Tunisian dinar (TND)', international: 'Other countries — euro (EUR)', update: 'Update',
    terms: 'One month of access. Manual renewal, no automatic charges.',
    pay: 'Activate Premium for one month', renew: 'Extend Premium by one month',
    explanation: 'Konnect payment provides one month of Premium access. To continue, choose to renew and make a new payment. No automatic charges.',
    pending: 'Payment is not confirmed yet. No new Premium access has been activated.',
    sandbox: 'Sandbox payment: no real money is collected. Test access is not valid in production.',
    confirmed: 'Payment confirmed. Your Premium access is active.',
    privacy: 'Konnect processes dinar payments. Card details are entered on its secure checkout. Babwork keeps payment references, amounts and statuses to activate your access.',
  },
  ar: {
    country: 'بلد الدفع وعملته', tunisia: 'تونس — الدينار التونسي', international: 'بلدان أخرى — اليورو', update: 'تحديث',
    terms: 'شهر واحد من الوصول. تجديد يدوي دون اقتطاع تلقائي.',
    pay: 'تفعيل Premium لمدة شهر', renew: 'تمديد Premium لشهر إضافي',
    explanation: 'يمنحك الدفع عبر Konnect شهراً من Premium. للاستمرار، اختر التجديد وأجرِ دفعة جديدة. لا يوجد اقتطاع تلقائي.',
    pending: 'لم يتم تأكيد الدفع بعد. لم يُفعّل وصول Premium جديد.',
    sandbox: 'دفع تجريبي: لا يتم تحصيل أموال حقيقية. الوصول التجريبي غير صالح في الإنتاج.',
    confirmed: 'تم تأكيد الدفع. وصول Premium الخاص بك نشط.',
    privacy: 'تعالج Konnect المدفوعات بالدينار. تُدخل بيانات البطاقة في صفحة الدفع الآمنة. يحتفظ Babwork بمراجع المدفوعات ومبالغها وحالاتها لتفعيل الوصول.',
  },
};

export function getPremiumMessages(locale: Locale, market: BillingMarket) {
  const t = premiumMessages[locale], b = billingMessages[locale];
  const price = premiumPrice(market, locale);
  const replace = (text: string) => text.replace(/€9|9\s*€/g, price);
  return { ...t, subscribe: market === 'TN' ? `${b.pay} — ${price}` : replace(t.subscribe), locked: replace(t.locked),
    cancelAnytime: market === 'TN' ? b.terms : t.cancelAnytime,
    pending: market === 'TN' ? b.pending : t.pending,
    billingPrivacy: market === 'TN' ? b.privacy : t.billingPrivacy };
}

export function getDiscoveryMessages(locale: Locale, market: BillingMarket, freeLaunch = false) {
  const t = discoveryMessages[locale];
  if (freeLaunch) {
    const l = launchMessages[locale];
    return { ...t, intro: l.intro, explore: l.action, priceNote: l.info, jobsText: l.jobsText, profileText: l.profileText, sample: l.sample, faqTitle: l.faqTitle, faqFreeText: l.freeText, faqBillingText: l.info };
  }
  const replace = (text: string) => text.replace(/€9|9\s*€/g, premiumPrice(market, locale));
  return { ...t, priceNote: replace(t.priceNote), faqBillingText: market === 'TN' ? `${premiumPrice(market, locale)}. ${billingMessages[locale].explanation}` : t.faqBillingText };
}
