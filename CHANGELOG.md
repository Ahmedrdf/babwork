# Changelog

Each version lists only the files changed in that version. "new" = file created, "deleted" = file to remove.
Phase 1 (the first Next.js version) is the starting point: every file of the project.

## v11 — the site is called Babwork
- `src/app/layout.tsx` — the logo now reads "Babwork"
- `src/i18n/messages.ts` — the name in all texts, in English, French and Arabic
- `src/lib/env.ts` — default email sender `Babwork <no-reply@…>`
- `src/ingest/sources.ts` — name sent to the job feeds when importing
- `package.json`, `package-lock.json` — project name `babwork`
- `.env.example`, `README.md`, `Dockerfile` — name in the docs and settings
- `src/app/globals.css`, `src/app/jobs/[id]/ApplyBox.tsx`, `src/components/Door.tsx`, `src/components/LogoMark.tsx` — comments only

## v10 — three languages (English, French, Arabic) and a new description
- new: `src/i18n/config.ts` (languages, country rules), `src/i18n/messages.ts` (all texts), `src/i18n/server.ts` (language detection), `src/i18n/client.tsx`
- new: `src/components/LanguageSwitch.tsx` — language links in the footer
- `src/app/layout.tsx` — page language and direction (right-to-left for Arabic), footer
- `src/app/page.tsx` — home page texts, new description without the number or names of sources
- `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/jobs/[id]/ApplyBox.tsx` — job pages translated, "via source" removed
- `src/components/JobCard.tsx` — card labels, dates and hours per week translated
- `src/components/AuthForm.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/forgot/page.tsx`, `src/app/reset/page.tsx`, `src/app/verify/page.tsx` — sign-in pages
- `src/app/profile/page.tsx`, `src/app/profile/ProfileForm.tsx`, `src/app/applications/page.tsx`, `src/app/applications/StatusSelect.tsx` — profile and tracker
- `src/components/VerifyBar.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`
- `src/actions/auth.ts`, `src/actions/account.ts` — error messages translated
- `src/lib/mail.ts` — email texts moved to the dictionary
- `src/lib/time.ts` — time difference returned as a number to format per language
- `src/app/globals.css` — Arabic font, right-to-left details, language links
- `package.json`, `package-lock.json` — Arabic font added (run `npm install`)
- `README.md` — how the language is chosen

## v9 — blue-door design, for visitors everywhere
- new: `src/lib/regions.ts` (the four regions), `src/lib/time.ts`, `src/lib/visitor.ts` (visitor's time zone and region)
- new: `src/components/RegionDetect.tsx`, `src/components/LogoMark.tsx`, `src/components/Door.tsx`, `src/app/icon.svg`
- `src/app/favicon.ico` — the door icon replaces the default one
- `src/app/globals.css` — rewritten: blue-door theme, tile frieze, arched logo frames
- `src/app/page.tsx` — door in the header, visitor's time, "Why" and FAQ sections
- `src/app/layout.tsx` — logo, frieze, region detection
- `src/lib/jobs.ts`, `src/components/JobCard.tsx`, `src/components/CategoryIcon.tsx`, `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx` — "Open to your region" badges and warning
- `src/app/privacy/page.tsx` — the new preference cookies
- `package.json`, `package-lock.json` — heading font changed (run `npm install`)
- `README.md`

## v8 — warm design with jobs shown in the header
- new: `src/components/CategoryIcon.tsx`
- `src/lib/jobs.ts` — region filter and counts
- `src/app/page.tsx`, `src/app/jobs/page.tsx`, `src/components/JobCard.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- `src/proxy.ts` — allow the fonts now served by the site itself
- `package.json`, `package-lock.json` — icons and fonts (run `npm install`)

## v7 — quiet green colours
- `src/app/globals.css`

## v6 — ink and sand colours
- `src/app/globals.css` — rewritten
- `src/components/JobCard.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/page.tsx` — salary shown as bold text

## v5 — free for job seekers, public job pages
- new: `src/lib/text.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`
- `src/app/jobs/[id]/page.tsx`, `src/app/jobs/[id]/ApplyBox.tsx` — public page, apply without paying, Google job markup
- `src/actions/account.ts` — email-apply safeguards, logging applications on the employer's site
- `src/actions/auth.ts`, `src/components/AuthForm.tsx`, `src/app/register/page.tsx` — back to the job after signing up
- `src/lib/env.ts`, `src/app/subscribe/page.tsx`, `src/app/api/billing/intent/route.ts`, `src/app/api/billing/dev-subscribe/route.ts` — payments switched off
- `src/lib/jobs.ts`, `src/app/layout.tsx`, `src/components/VerifyBar.tsx`, `src/app/jobs/page.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/app/profile/page.tsx`, `src/app/profile/ProfileForm.tsx`, `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`
- `.env.example`, `README.md`

## v4 — "New" marker, similar jobs, categories, viewed jobs
- new: `src/ingest/categories.ts`, `src/components/TrackView.tsx`, `scripts/recategorize.ts`
- new: `drizzle/0001_job_views.sql`, `drizzle/meta/0001_snapshot.json` (run `npm run db:migrate`)
- `drizzle/meta/_journal.json`, `src/db/schema.ts`, `src/ingest/run.ts`, `src/actions/account.ts`, `src/lib/jobs.ts`
- `src/components/JobCard.tsx`, `src/app/page.tsx`, `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/applications/page.tsx`
- `src/app/globals.css`, `scripts/seed.ts`, `package.json`

## v3 — job cards with excerpts and side filters
- new: `src/components/JobCard.tsx`
- deleted: `src/components/JobRow.tsx`
- `src/lib/jobs.ts`, `src/app/jobs/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/page.tsx`, `src/app/applications/page.tsx`
- `src/app/globals.css`, `scripts/seed.ts`
- `src/proxy.ts` — fix for the "eval() is not supported" message in development
