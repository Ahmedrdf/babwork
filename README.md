# Babwork

Remote & part-time job aggregator, free for job seekers: one profile to apply everywhere, and a tracker.
Next.js 16 · TypeScript · Postgres (Drizzle) · Stripe · Resend · Cloudflare R2.

```
Anyone         browse, search and read every listing (public pages, indexed by search engines)
Free account   apply with saved profile + CV, email applications, tracker, saved jobs, viewed jobs
```
Browsing, profiles, manual applications and tracking remain free. Premium adds private CV-to-job
matching for 9.900 TND per month in Tunisia (manual renewal), or EUR 9/month via Stripe internationally.
The offer is visible at `/subscribe`; each checkout stays off until its provider is configured.

---

## 1. Run locally (5 minutes, nothing to install but Node)

```bash
npm install
cp .env.example .env            # defaults below already work for local dev
npm run db:migrate              # creates the schema
npm run seed                    # 4 sample jobs (offline)
npm run dev                     # http://localhost:3000
```

`.env` for local dev — only these four lines are needed:

```
DATABASE_URL=pglite://./.pglite      # embedded Postgres, no server needed
SESSION_SECRET=any-long-random-string
CRON_SECRET=another-random-string
APP_URL=http://localhost:3000
```

Without Resend/R2 keys the app degrades gracefully: emails are printed to the terminal (or the host's logs),
and CVs are stored in the database. Password reset requires email delivery to be configured;
without it, the form displays an unavailable message instead of claiming a reset email was sent.

To receive password reset emails locally, set `RESEND_API_KEY` and `MAIL_FROM` in `.env`
(see section 2.4), keep `APP_URL=http://localhost:3000`, then restart `npm run dev`.

Pull real jobs: `npm run ingest` (needs internet; ~400 listings from Remotive, Arbeitnow, Jobicy, RemoteOK).

With `pglite://`, stop the dev server before running migrations, imports, seeds, or other
database scripts. The embedded database supports one process at a time; a lock prevents
concurrent processes from corrupting its files. Use Postgres for concurrent server and CLI access.

---

## 2. Deploy for free (Netlify + Neon + R2 + Resend + GitHub Actions)

### 2.1 Accounts (all free, no card)
| Service | What for | Where |
|---|---|---|
| GitHub | code + scheduled ingestion | github.com |
| Netlify | hosting (commercial use allowed on free plan) | netlify.com |
| Neon | Postgres | neon.tech |
| Cloudflare | R2 storage for CVs (10 GB free) | dash.cloudflare.com |
| Resend | transactional email (3,000/month free) | resend.com |
| Stripe | payments (no monthly fee) | stripe.com |

### 2.2 Database (Neon)
1. New project → copy the **pooled** connection string (ends with `-pooler…?sslmode=require`).
2. Locally: `DATABASE_URL="<that string>" npm run db:migrate` — creates all tables in Neon.

### 2.3 CV storage (Cloudflare R2) — optional
Without R2, CVs are stored in the database (table `cv_files`), which is fine for a site that's starting.
Add R2 later when you have many users.
1. R2 → Create bucket `babwork-cvs` (keep it private).
2. R2 → Manage API tokens → Create token with *Object Read & Write* on that bucket.
3. Note `Account ID`, `Access Key ID`, `Secret Access Key`.

### 2.4 Email (Resend)
1. Add and verify your domain (or use the `onboarding@resend.dev` sender for testing).
2. Create an API key.

### 2.5 Hosting (Netlify)
1. Push this repo to GitHub.
2. Netlify → Add new site → Import from GitHub → pick the repo. Build settings are read from `netlify.toml`.
3. Site configuration → Environment variables → add:

```
DATABASE_URL                      (Neon pooled string)
SESSION_SECRET                    (openssl rand -hex 32)
CRON_SECRET                       (openssl rand -hex 32)
APP_URL                           https://<your-site>.netlify.app  (or your domain)
CONTACT_EMAIL                     public address shown on /legal and /privacy
RESEND_API_KEY, MAIL_FROM
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
```
4. Deploy. Check `https://<site>/api/health` → `{"ok":true,"db":"up"}`.

### 2.6 Scheduled ingestion (GitHub Actions)
Repo → Settings → Secrets and variables → Actions → add `DATABASE_URL` (the same Neon pooled string as on Netlify).
The workflow in `.github/workflows/ingest.yml` checks out the code, runs `npm run ingest` against the database every
3 hours, and can be triggered manually from the Actions tab. It runs on GitHub rather than on Netlify because Netlify's
free-tier functions stop after 10 seconds. Each run also deletes expired sessions, tokens and rate-limit rows.
First run: Actions → "Ingest jobs" → Run workflow.
`POST /api/cron/ingest` (header `Authorization: Bearer <CRON_SECRET>`) remains for a manual run from the site.

### 2.7 Payments (Stripe) — optional, off by default
Start in Stripe test mode. Add these values to `.env` locally or Netlify's environment settings:
1. Products → Add product **Babwork Premium**, recurring **EUR 9.00 each month**, quantity 1 → copy `price_…` → `STRIPE_PRICE_ID`.
2. Developers → API keys → `STRIPE_SECRET_KEY`. Hosted Checkout does not require a publishable key.
3. Developers → Webhooks → Add endpoint `https://<site>/api/billing/webhook`, events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   → `STRIPE_WEBHOOK_SECRET`
4. Settings → Billing → Customer portal → enable (for "Change card or cancel").
5. Set `PAYMENTS_ENABLED=1` and set `APP_URL` to the actual public origin. Restart locally or redeploy.
   All three Stripe values (secret key, price ID, webhook secret) are required. Checkout refuses a Price
   with the wrong amount, currency or billing interval. Use separate live-mode keys and Price when launching.

For local webhook testing, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/billing/webhook`
and use the signing secret printed by that command. Configure Customer Portal cancellation/payment updates.
Deleting an account cancels its associated subscription before deleting the local account.

Test with card `4242 4242 4242 4242` (any future date, any CVC). `4000 0025 0000 3155` triggers 3-D Secure.

### Premium CV matching

After a successful file import, the matching form displays the CV in a panel on its right
(below the form on mobile). The panel is hidden before importing a file. PDFs are rendered locally with PDF.js, with page navigation and a stable-height
scrollable canvas. DOCX, TXT and pasted content use a plain-text preview. The original
PDF stays visible while the extracted text in the form can be edited for matching.
No document upload, embedded frame or external viewer is used for this preview.
Reserved scrollbar space and retained canvas layout prevent resize feedback while loading.

After matching, the recommendations page includes an **Improve my CV** panel.
The user chooses a matched job and receives three predefined suggestions personalized
with CV/job keyword matches and the job title, in French, English or Arabic.
Suggestions and copying work entirely in the browser, without an additional model or API.
Keyword checks can miss synonyms; an unmentioned skill is not necessarily absent.
The optional Qwen priority ranking has been removed. The original multilingual model
used for CV-to-job matching remains unchanged.

For local testing without payment, set `CV_MATCHING_PREVIEW=1` in `.env`, restart `npm run dev`,
sign in, and open `/recommendations`. A test banner is displayed. This does not change the user's
plan or create a Stripe subscription, and checkout is blocked while preview mode is active.
The flag is ignored unless `NODE_ENV=development`; it cannot unlock production access.
Set it back to `0` and restart to test normal Premium access restrictions.

`/recommendations` and its job-data API require an active Premium account. Upload PDF/DOCX/TXT
(4 MB maximum), use your saved CV, or paste text; scanned PDFs need pasted text. Region filtering
uses the same eligibility hints as the job browser. Up to the 300 most recent active jobs are compared;
the ten closest results above a minimum similarity threshold are shown. This is semantic discovery,
not a hiring probability or a guarantee of eligibility. Tag explanations are literal text matches.

The free Apache-2.0 multilingual MiniLM model runs in a Web Worker through Transformers.js.
The initial model download can take several minutes and is cached by the browser. CV text is processed
locally; the matching tool does not upload/store it. The user's saved profile CV is fetched only on request.
Slow/offline/unsupported devices show an error and retain free browsing. Leaving the page clears matching state.
The model currently uses `Xenova/paraphrase-multilingual-MiniLM-L12-v2` with quantized WASM inference.
Model card: https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2

`npm install`, `npm run dev`, and `npm run build` prepare same-origin PDF/WASM runtime files in
`public/ai-runtime/`. This generated folder and local model test cache are excluded from source control.
`npm run test:premium` checks entitlement, pricing, checkout ownership and CV matching boundaries.

### 2.8 Custom domain
Netlify → Domain management → add domain, follow DNS steps; set `APP_URL` to the new domain and update the Stripe webhook URL.

### Tunisia payments with Konnect

Tunisia uses **9.900 TND for one calendar month**, renewed manually. It is a prepaid month of
Premium, not an automatic debit mandate. A second successful payment extends the existing period
by one calendar month. Other markets retain the existing EUR 9 monthly Stripe subscription.

1. Create a test account at https://dashboard.sandbox.konnect.network and obtain its API key and receiver wallet ID.
2. Set `KONNECT_MODE=sandbox`, `KONNECT_API_KEY` and `KONNECT_WALLET_ID` in your local `.env`.
3. Set `APP_URL` to a public HTTPS URL reaching this development server, e.g. an HTTPS development tunnel.
   The callback is `/api/billing/konnect/confirm`; localhost/private addresses cannot receive Konnect callbacks.
4. Set `PAYMENTS_ENABLED=1` and `CV_MATCHING_PREVIEW=0`, restart, and select **Tunisia — DT** on `/subscribe`.
5. Use only the test cards in the official sandbox documentation. Check an incomplete payment, a successful
   payment, duplicate callbacks, access expiry and renewal. This repository also tests these using synthetic
   provider responses and an isolated real embedded PostgreSQL database (`npm run test:premium`).
6. For real payments, complete the verification at https://dashboard.konnect.network, use live credentials,
   set `KONNECT_MODE=live`, and configure the real HTTPS Netlify URL. Netlify's supplied subdomain is sufficient;
   a purchased domain is not required. Run database migrations against the deployment database before deploying.

Checkout stays disabled until the key, wallet, public HTTPS callback origin and enable flag are configured.
Sandbox receipts carry `premium_source=konnect:sandbox` and cannot grant production access, even if a development
database is accidentally reused. Do not enable sandbox checkout on the public production app; use the local
development server through a tunnel. Local free CV preview remains a separate no-payment mode.

Amounts are sent as integer millimes: 9.900 TND = **9900**, not 990. Konnect's callback is verified by fetching
the payment server-side and checking completed status, order ID, currency, full amount and receiver wallet.
Database row locks and a paid marker prevent duplicate month grants. One pending order per user/environment
prevents parallel checkout creation. A return URL or an unsigned client success flag never grants access.

The country is suggested from hosting geolocation/time zone and can be selected explicitly on the pricing page.
Selection is remembered separately from the interface language. French is the default language for Tunisia.
API keys stay on the server. Deleting an account removes its link to the local payment records.

Official references: https://docs.konnect.network/docs/fr/overview/environments
and https://docs.konnect.network/docs/fr/api-integration/endpoints/initiate-payment

---

## 3. Project layout

```
src/
  app/                    routes (App Router)
    page.tsx              home
    jobs/                 list + [id] detail with ApplyBox
    login register forgot reset verify
    profile/              profile + CV + delete account
    subscribe/            plan comparison + embedded Stripe Payment Element
    applications/         tracker + saved jobs
    api/
      billing/            intent · webhook · portal · success · dev-subscribe
      cron/ingest         protected import endpoint (manual trigger; the schedule runs in GitHub Actions)
      profile/cv          owner-only CV download
      health
    terms privacy         templates — have them reviewed
  actions/                server actions: auth.ts, account.ts
  lib/                    auth (sessions, tokens), env, jobs queries, mail, storage, stripe, rate-limit
  db/                     schema.ts (Drizzle) + client (Postgres or pglite:// for dev)
  ingest/                 sources.ts (feeds) + run.ts (sanitize, dedup, batched upsert, expire) + cleanup.ts (expired rows)
  proxy.ts                security headers + CSP
drizzle/                  SQL migrations (npm run db:generate after schema changes)
scripts/                  migrate, seed, ingest
.github/workflows/        scheduled ingestion
netlify.toml Dockerfile   deploy
```

## 4. How the pieces work

**Auth.** Opaque session id in an httpOnly cookie, hashed in the `sessions` table (30 days).
Email verification and password reset use single-use hashed tokens. Login, signup, reset and
resend are rate-limited through the `rate_limits` table, so limits hold across serverless instances.

**Subscription.** `users.plan` + `subscription_ends_at`. The browser confirms payment with
Stripe.js, lands on `/api/billing/success` which activates immediately, and the webhook keeps
state in sync afterwards. Every Stripe event id is stored in `stripe_events`, so retries are no-ops.

**Apply.** Listing has a contact email → CV + cover note sent via Resend with the candidate as
reply-to. Otherwise → application logged, user redirected to the employer's form. Both appear in
the tracker.

**Ingestion.** Four official feeds → sanitize HTML → normalize type → extract hours/week →
fingerprint `company|title` for cross-source dedup → upsert. Jobs not seen for 14 days are
deactivated. Runs are logged in `ingest_runs`.

**Search.** Postgres full-text (`websearch_to_tsquery`) over title, company, category, description,
with a GIN expression index.

**Regions.** On a first visit, the browser's time zone (e.g. `Africa/Tunis`) is stored in two preference
cookies (`rp_tz`, `rp_region`). Each job's location is matched against four regions (Europe, Americas,
Middle East & Africa, Asia-Pacific) in `src/lib/regions.ts`; the same rules drive the SQL filter
(`/jobs?region=…`), the "Open to …" badges and the warning on job pages that may not be open to the visitor.

**Design.** Blue-door theme: all colours are variables at the top of `src/app/globals.css`.
The door (`src/components/Door.tsx`), the logo mark and the tile frieze are original drawings.
Fonts are self-hosted with Fontsource (Figtree for text, El Messiri for headings and Arabic).

**Languages.** English, French and Arabic (right-to-left), all text in `src/i18n/messages.ts`.
The language is chosen in this order: the one the visitor picked in the footer (cookie `rp_lang`), then the
country sent by the host (`x-nf-geo` on Netlify, `x-vercel-ip-country`, `cf-ipcountry`, `x-country`), then the
browser's time zone, then English. France and Tunisia get French, other Arab League countries get Arabic, everyone else
English. Job listings keep their original language.

## 5. Commands

```
npm run dev           start locally
npm run build/start   production build / serve
npm run typecheck     tsc
npm run db:generate   new migration from schema changes
npm run db:migrate    apply migrations to DATABASE_URL
npm run db:studio     browse the DB (Postgres only)
npm run seed          sample jobs
npm run ingest        import real jobs now
```

## 6. Before you launch — checklist
- [ ] Replace the terms/privacy templates with reviewed text; add your company details
- [ ] Fill in the publisher's name and address in `src/lib/legal.ts` and set `CONTACT_EMAIL` (shown on `/legal`)
- [ ] Set `MAIL_FROM` to a verified domain so application emails don't land in spam
- [ ] Add Sentry (or Netlify's log drains) for error alerts
- [ ] Decide refund policy; the terms template says 14 days
- [ ] Submit `https://<site>/sitemap.xml` in Google Search Console

## 7. What's next (Phase 2+)
Email alerts for saved searches · Greenhouse/Lever boards for a curated company list ·
employer side (direct postings, native apply, dashboard) · admin panel · FR/EN · SEO landing pages.
# Discovery, free comparison and listing quality

**Current launch mode is free in production as well as development.** `FREE_LAUNCH=1` is the default even when the variable is absent on Netlify. Signed-in users can repeat CV matching, including accounts whose original trial was already consumed. It does not change plans, subscriptions or stored trials. Stripe/Konnect checkout creation and pricing visibility are disabled by this mode, even if their individual flags are enabled. Existing billing receipts/webhooks and customer cancellation access remain available. Public text is adjusted in French, English and Arabic. No new migration is needed; deploy this code to apply the behavior to the hosted site.

For a future paid launch, explicitly set `FREE_LAUNCH=0`, then configure and enable pricing and payments separately. The one-successful-comparison trial described below applies only after that change. Development preview remains development-only and is independent of the production free-launch mode.

Pricing is currently hidden by default (`PRICING_VISIBLE=0`). `/subscribe` redirects to `/about`; navigation, profile, trial completion and marketing surfaces omit pricing links and amounts. The help FAQ lives at `/about#questions`, without a billing question while pricing is hidden. Existing Stripe customers retain access to their billing portal from their profile. Set `PRICING_VISIBLE=1` when ready to publish the configured prices again. This flag controls presentation and does not grant Premium access or enable payments.

`/about` and `/contact` explain the product and link to help without inventing publisher details. Public coordinates are intentionally left for the owner to supply later. Existing legal drafts still need completion before launch.

When `FREE_LAUNCH=0`, each signed-in account can complete one free CV comparison in production. Premium and the explicit development preview retain unlimited comparisons. `/api/recommendations/session` issues a one-hour permit; cancelled or failed analysis does not consume the trial. Successful completion records its use; retries of that acknowledgement are idempotent. No CV text is submitted to this endpoint. Recommendations remain browser-local and disappear when the page is closed. This is an application usage limit, not a way to prevent someone implementing their own comparison of public job listings. Free launch bypasses this trial restriction entirely.

The Tunisia filter (`/jobs?country=TN`, also in the CV matcher) selects locations explicitly mentioning Tunisia or worldwide. Generic “Remote”, Africa and EMEA are excluded because those labels alone do not establish country eligibility. Detailed employer restrictions still need checking.

Signed-in users can report a job and give useful/not-relevant feedback on a recommendation. Reports are deduplicated per account/job. The private `/admin/reports` page is available only to accounts whose existing `users.is_admin` flag is true. No account is automatically promoted. It lists up to 100 pending reports and aggregate feedback; an administrator can dismiss a report or deactivate its job. The persistent `jobs.moderation_blocked` flag stops feed refreshes from reactivating a removed job, even if the reporting account is deleted. An operator can clear that flag explicitly after reviewing the listing. Use a trusted database administration session to manage administrator roles; never expose a public role-granting endpoint.

Apply the additive migrations before starting the updated application: `npm run db:migrate`. Stop the development server first when using PGlite. Run `npm test` for billing, trial, permissions and moderation regression checks. Integration tests use isolated, in-memory databases and never send emails or charge payments.

Remaining external launch setup: a verified sending domain for emails beyond Resend's test-recipient restriction, merchant validation and production Konnect credentials, publisher details when the owner is ready, and testing on real mobile devices. These are not enabled by the code changes.


