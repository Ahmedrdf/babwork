import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, profiles } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { getCv } from '@/lib/storage';

// Users can download only their own CV.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const [p] = await db.select({ cvKey: profiles.cvKey, name: profiles.cvOriginalName }).from(profiles).where(eq(profiles.userId, user.id));
  if (!p?.cvKey) return new NextResponse('No CV uploaded', { status: 404 });
  const body = await getCv(p.cvKey);
  return new NextResponse(new Uint8Array(body), {
    headers: { 'Content-Disposition': `attachment; filename="${(p.name || 'cv.pdf').replace(/"/g, '')}"`, 'Content-Type': 'application/octet-stream' },
  });
}
