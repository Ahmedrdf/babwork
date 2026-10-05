import { NextResponse } from 'next/server';

// Retired: the site is free for job seekers. Kept as a stub so old links get a 404.
export async function POST() {
  return new NextResponse('Not found', { status: 404 });
}
