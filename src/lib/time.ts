export function isValidTimeZone(tz: string) {
  try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return true; } catch { return false; }
}

export function clock(tz: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(now);
}

function offsetMinutes(tz: string, now: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** How far `toTz` is ahead of `fromTz` right now, as "+1" or "−5" (null when it's the same time). Handles summer time. */
export function hourDiff(fromTz: string, toTz: string, now = new Date()): string | null {
  const d = offsetMinutes(toTz, now) - offsetMinutes(fromTz, now);
  if (d === 0) return null;
  const h = Math.abs(d) / 60;
  return `${d > 0 ? '+' : '−'}${Number.isInteger(h) ? h : h.toFixed(1)}`;
}

export const cityFromTz = (tz: string) => (tz.split('/').pop() || tz).replace(/_/g, ' ');
