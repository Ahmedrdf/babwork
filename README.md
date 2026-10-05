# Babwork

Remote & part-time job aggregator, free for job seekers: one profile to apply everywhere, and a tracker.
Next.js 16 · TypeScript · Postgres (Drizzle) · Stripe · Resend · Cloudflare R2.

```
Anyone         browse, search and read every listing (public pages, indexed by search engines)
Free account   apply with saved profile + CV, email applications, tracker, saved jobs, viewed jobs
```
Payments (Stripe) are switched off. The code is kept for employer payments later: set `PAYMENTS_ENABLED=1` plus the Stripe keys.

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

Without Stripe/Resend/R2 keys the app degrades gracefully: emails are printed to the terminal,
CVs are saved under `./.uploads`, and `/subscribe` shows a **Dev subscribe** button.

Pull real jobs: `npm run ingest` (needs internet; ~400 listings from Remotive, Arbeitnow, Jobicy, RemoteOK).

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

### 2.3 CV storage (Cloudflare R2)
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
RESEND_API_KEY, MAIL_FROM
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
```
4. Deploy. Check `https://<site>/api/health` → `{"ok":true,"db":"up"}`.

### 2.6 Scheduled ingestion (GitHub Actions)
Repo → Settings → Secrets and variables → Actions → add `APP_URL` and `CRON_SECRET` (same values as Netlify).
The workflow in `.github/workflows/ingest.yml` runs every 3 hours and can be triggered manually from the Actions tab.
First run: Actions → "Ingest jobs" → Run workflow.

### 2.7 Payments (Stripe) — optional, off by default
Only needed when you start charging (e.g. employers). Add `PAYMENTS_ENABLED=1` with these keys.
1. Products → Add product, recurring €9/month → copy `price_…` → `STRIPE_PRICE_ID`
2. Developers → API keys → `STRIPE_SECRET_KEY` (sk_) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_)
3. Developers → Webhooks → Add endpoint `https://<site>/api/billing/webhook`, events
   `invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   → `STRIPE_WEBHOOK_SECRET`
4. Settings → Billing → Customer portal → enable (for "Change card or cancel").
5. Set `PAYMENTS_ENABLED=1`. Redeploy.

Test with card `4242 4242 4242 4242` (any future date, any CVC). `4000 0025 0000 3155` triggers 3-D Secure.

### 2.8 Custom domain
Netlify → Domain management → add domain, follow DNS steps; set `APP_URL` to the new domain and update the Stripe webhook URL.

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
      cron/ingest         protected import endpoint (GitHub Actions calls it)
      profile/cv          owner-only CV download
      health
    terms privacy         templates — have them reviewed
  actions/                server actions: auth.ts, account.ts
  lib/                    auth (sessions, tokens), env, jobs queries, mail, storage, stripe, rate-limit
  db/                     schema.ts (Drizzle) + client (Postgres or pglite:// for dev)
  ingest/                 sources.ts (feeds) + run.ts (sanitize, dedup, upsert, expire)
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
browser's time zone, then English. France gets French, the 22 Arab League countries get Arabic, everyone else
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
- [ ] Set `MAIL_FROM` to a verified domain so application emails don't land in spam
- [ ] Add Sentry (or Netlify's log drains) for error alerts
- [ ] Decide refund policy; the terms template says 14 days
- [ ] Submit `https://<site>/sitemap.xml` in Google Search Console

## 7. What's next (Phase 2+)
Email alerts for saved searches · Greenhouse/Lever boards for a curated company list ·
employer side (direct postings, native apply, dashboard) · admin panel · FR/EN · SEO landing pages.
