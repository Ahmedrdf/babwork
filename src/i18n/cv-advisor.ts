export const cvAdvisorMessages = {
  fr: {
    title: 'Améliorer mon CV pour une offre',
    intro: 'Choisissez une offre pour obtenir des pistes concrètes afin de mieux présenter votre expérience et vos compétences.',
    job: 'Offre à préparer', copy: 'Copier les conseils', copied: 'Conseils copiés', copyFailed: 'Copie impossible. Sélectionnez le texte pour le copier.',
    baseline: 'Pistes liées au CV et à l’offre',
    review: 'La détection utilise les mots-clés de l’offre et peut manquer des synonymes. Un mot non repéré ne signifie pas une compétence absente. N’ajoutez que des faits réels.',
  },
  en: {
    title: 'Improve my CV for a job',
    intro: 'Choose a job to receive practical suggestions for presenting your experience and skills more clearly.',
    job: 'Target job', copy: 'Copy suggestions', copied: 'Suggestions copied', copyFailed: 'Could not copy. Select the text to copy it manually.',
    baseline: 'Suggestions linked to the CV and job',
    review: 'Keyword detection uses job tags and can miss synonyms. An undetected keyword does not mean you lack a skill. Only add true information.',
  },
  ar: {
    title: 'تحسين سيرتي لوظيفة محددة',
    intro: 'اختر عرضًا للحصول على اقتراحات عملية لعرض خبراتك ومهاراتك بوضوح أكبر.',
    job: 'الوظيفة المستهدفة', copy: 'نسخ الاقتراحات', copied: 'تم نسخ الاقتراحات', copyFailed: 'تعذر النسخ. حدد النص لنسخه يدويًا.',
    baseline: 'اقتراحات مرتبطة بالسيرة والعرض',
    review: 'يعتمد الكشف على كلمات العرض وقد لا يتعرف على المرادفات. عدم العثور على كلمة لا يعني عدم إتقان المهارة. أضف المعلومات الحقيقية فقط.',
  },
} as const;

export const cvAdviceTemplates = {
  fr: {
    experienceTitle: 'Montrer comment vous utilisez vos compétences',
    experience: (skills: string) => `Le CV et l’offre mentionnent ${skills}. Dans une expérience ou un projet réel, précisez votre contribution et la façon dont vous avez utilisé ces compétences.`,
    experienceFallback: 'Choisissez une expérience ou un projet réel en rapport avec les missions de l’offre et expliquez votre contribution personnelle.',
    keywordsTitle: 'Clarifier les mots-clés de l’offre',
    keywords: (skills: string) => `L’offre mentionne ${skills}, dont les mots n’ont pas été repérés dans le CV. Si vous maîtrisez ces compétences, indiquez un exemple réel ; sinon, ne les ajoutez pas comme compétences acquises.`,
    keywordsFallback: 'Regroupez vos compétences réelles dans une rubrique facile à lire et utilisez, lorsque le sens correspond, le vocabulaire de l’offre.',
    summaryTitle: 'Cibler le titre et le résumé',
    summary: (title: string) => `Pour l’offre « ${title} », reliez votre titre ou votre résumé à vos expériences réelles les plus pertinentes. Présentez clairement le rôle recherché sans vous attribuer une fonction ou une ancienneté non acquise.`,
  },
  en: {
    experienceTitle: 'Show how you use your skills',
    experience: (skills: string) => `Both the CV and job mention ${skills}. In a real experience or project, explain your contribution and how you used these skills.`,
    experienceFallback: 'Choose a real experience or project related to the job duties and explain your own contribution.',
    keywordsTitle: 'Clarify job keywords',
    keywords: (skills: string) => `The job mentions ${skills}, whose keywords were not detected in the CV. If you have these skills, give a real example; otherwise, do not list them as acquired skills.`,
    keywordsFallback: 'Group your real skills in an easy-to-read section and use the job’s wording where it accurately describes your experience.',
    summaryTitle: 'Tailor the headline and summary',
    summary: (title: string) => `For the job “${title}”, connect your headline or summary to your most relevant real experience. State your target role without claiming a position or seniority you have not held.`,
  },
  ar: {
    experienceTitle: 'وضّح كيف تستخدم مهاراتك',
    experience: (skills: string) => `تذكر السيرة والعرض ${skills}. وضّح مساهمتك وكيف استخدمت هذه المهارات في تجربة أو مشروع حقيقي.`,
    experienceFallback: 'اختر تجربة أو مشروعًا حقيقيًا يرتبط بمهام العرض واشرح مساهمتك الشخصية.',
    keywordsTitle: 'وضّح كلمات العرض الأساسية',
    keywords: (skills: string) => `يذكر العرض ${skills} ولم نعثر على كلماتها في السيرة. إذا كنت تتقن هذه المهارات فاذكر مثالًا حقيقيًا، وإلا فلا تضفها كمهارات مكتسبة.`,
    keywordsFallback: 'اجمع مهاراتك الحقيقية في قسم واضح واستخدم مفردات العرض عندما تعبّر بدقة عن خبرتك.',
    summaryTitle: 'خصّص العنوان والملخص',
    summary: (title: string) => `للعرض «${title}» اربط عنوان سيرتك أو ملخصها بخبراتك الحقيقية الأكثر صلة. وضّح الوظيفة المستهدفة دون ادعاء منصب أو أقدمية لم تكتسبها.`,
  },
} as const;


