import {
  pgTable, serial, text, timestamp, boolean, integer, jsonb, uniqueIndex, index, primaryKey, pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const planEnum = pgEnum('plan', ['free', 'pro']);
export const jobTypeEnum = pgEnum('job_type', ['full_time', 'part_time', 'contract', 'freelance', 'internship', 'other']);
export const applyMethodEnum = pgEnum('apply_method', ['redirect', 'email']);
export const applicationStatusEnum = pgEnum('application_status', ['applied', 'interviewing', 'rejected', 'offer']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  plan: planEnum('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionEndsAt: timestamp('subscription_ends_at', { withTimezone: true }),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // random 32-byte hex
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('sessions_user_idx').on(t.userId)]);

// Email verification and password reset tokens (hashed at rest)
export const tokens = pgTable('tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(), // verify_email | reset_password
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const profiles = pgTable('profiles', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull().default(''),
  headline: text('headline').notNull().default(''),
  location: text('location').notNull().default(''),
  phone: text('phone').notNull().default(''),
  linkedinUrl: text('linkedin_url').notNull().default(''),
  portfolioUrl: text('portfolio_url').notNull().default(''),
  summary: text('summary').notNull().default(''),
  coverNote: text('cover_note').notNull().default(''),
  cvKey: text('cv_key'),            // object key in R2
  cvOriginalName: text('cv_original_name'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(),        // remotive | arbeitnow | jobicy | remoteok | direct
  sourceId: text('source_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  companyLogo: text('company_logo'),
  location: text('location').notNull().default('Remote'),
  jobType: jobTypeEnum('job_type').notNull().default('full_time'),
  category: text('category').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  salary: text('salary').notNull().default(''),
  hoursPerWeek: text('hours_per_week').notNull().default(''),
  description: text('description').notNull().default(''),
  applyUrl: text('apply_url').notNull(),
  applyEmail: text('apply_email'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
}, (t) => [
  uniqueIndex('jobs_source_idx').on(t.source, t.sourceId),
  index('jobs_fingerprint_idx').on(t.fingerprint),
  index('jobs_published_idx').on(t.publishedAt),
  index('jobs_search_idx').using('gin', sql`to_tsvector('english', coalesce(${t.title}, '') || ' ' || coalesce(${t.company}, '') || ' ' || coalesce(${t.category}, '') || ' ' || coalesce(${t.description}, ''))`),
]);

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  method: applyMethodEnum('method').notNull(),
  coverNote: text('cover_note').notNull().default(''),
  status: applicationStatusEnum('status').notNull().default('applied'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('applications_user_job_idx').on(t.userId, t.jobId)]);

export const savedJobs = pgTable('saved_jobs', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.jobId] })]);

// Which jobs a user has opened: greys out visited cards, and later powers "popular" and recommendations
export const jobViews = pgTable('job_views', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: integer('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.jobId] }), index('job_views_job_idx').on(t.jobId)]);

export const ingestRuns = pgTable('ingest_runs', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  fetched: integer('fetched').notNull().default(0),
  inserted: integer('inserted').notNull().default(0),
  updated: integer('updated').notNull().default(0),
  skippedDuplicates: integer('skipped_duplicates').notNull().default(0),
  error: text('error'),
});

// Stripe events we've already processed, so a replayed webhook is a no-op
export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

// DB-backed rate limiting (works across serverless instances)
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),       // e.g. login:ip:1.2.3.4
  count: integer('count').notNull().default(0),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  applications: many(applications),
}));
export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  user: one(users, { fields: [applications.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
