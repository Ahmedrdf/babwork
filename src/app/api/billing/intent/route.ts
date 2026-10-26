import { NextResponse } from 'next/server';

// Checkout now starts explicitly, rather than creating subscriptions on page load.
export async function POST() { return new NextResponse('Not found', { status: 404 }); }
