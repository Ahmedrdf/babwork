import { env } from './env';

/**
 * Who publishes the site — shown on /legal in every language.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │  TO COMPLETE BEFORE LAUNCH: replace the two bracketed values below.          │
 * │  Optional fields may stay '' — they are then simply not shown.               │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */
export const PUBLISHER = {
  /** Company name, or your full name if you publish as an individual. */
  name: '[PUBLISHER NAME — TO COMPLETE]',
  /** Postal address of the publisher. */
  address: '[PUBLISHER ADDRESS — TO COMPLETE]',
  /** Optional: person responsible for the content (the "directeur de la publication" in France). */
  director: '',
  /** Optional: company registration number (SIREN, RCS, Companies House…). */
  registration: '',
};

/** Where the site runs. Netlify's postal address: check it on netlify.com before launch. */
export const HOST = {
  name: 'Netlify, Inc.',
  address: 'San Francisco, California, United States',
  url: 'https://www.netlify.com',
};

/** Public contact address, from CONTACT_EMAIL. The placeholder makes a missing value obvious on the page. */
export function contactEmail() {
  return env.CONTACT_EMAIL || '[CONTACT_EMAIL — set it in .env]';
}
