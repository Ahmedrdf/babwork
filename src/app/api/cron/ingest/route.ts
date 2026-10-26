import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { ingestAll } from '@/ingest/run';
import { env } from '@/lib/env';

export const maxDuration = 300;

function authorized(req: NextRequest) {
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const expected = env.CRON_SECRET;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// Manual trigger only (curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/ingest).
// The scheduled import runs in GitHub Actions (.github/workflows/ingest.yml): on Netlify's free tier
// functions stop after 10 seconds, which isn't enough for four feeds.
export async function POST(req: NextRequest) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 });
  const result = await ingestAll();
  console.log('[ingest]', JSON.stringify(result));
  return NextResponse.json(result);
}
