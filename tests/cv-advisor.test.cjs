const { test } = require('node:test');
const assert = require('node:assert/strict');
const advisor = require('../src/lib/cv-advisor.ts');
const { cvAdvisorMessages, cvAdviceTemplates } = require('../src/i18n/cv-advisor.ts');

const request = { locale: 'fr', cv: 'Développeuse JavaScript. Création de sites React accessibles pour une association.',
  job: { id: 1, title: 'Frontend developer', company: 'Fixture', location: 'Remote', category: 'IT',
    tags: ['React', 'TypeScript'], description: 'Build accessible interfaces with React and TypeScript.', salary: '' } };

test('tips distinguish skills already mentioned from unrecognized keywords without inventing qualifications', () => {
  const tips = advisor.adviceTips(request);
  assert.equal(tips.length, 3);
  assert.match(tips[0].body, /React/);
  assert.match(tips[1].body, /TypeScript/);
  assert.match(tips[1].body, /Si vous maîtrisez/);
  assert.ok(!tips.some(tip => /Python|Docker|Kubernetes/.test(tip.body)));
  assert.ok(advisor.adviceText(tips).startsWith('1. Montrer'));
  const missing = advisor.adviceTips({ ...request, job: { ...request.job, tags: [] } });
  assert.ok(missing.every(tip => tip.body.length > 20 && !tip.body.includes('undefined')));
});

test('suggestions follow the interface language and retain actual job context', () => {
  for (const locale of ['fr', 'en', 'ar']) {
    const tips = advisor.adviceTips({ ...request, locale });
    assert.equal(tips[0].title, cvAdviceTemplates[locale].experienceTitle);
    assert.ok(tips[2].body.includes(request.job.title));
    assert.deepEqual(Object.keys(cvAdvisorMessages[locale]).sort(), Object.keys(cvAdvisorMessages.en).sort());
  }
});
