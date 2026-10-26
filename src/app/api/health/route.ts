import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: 'up', time: new Date().toISOString() });
  } catch (err) {
    console.error('[health] Database check failed', err);
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
