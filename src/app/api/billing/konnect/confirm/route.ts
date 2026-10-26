import { NextResponse, type NextRequest } from 'next/server';
import { confirmKonnectPayment, isKonnectReference } from '@/lib/konnect';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('payment_ref');
  if (!isKonnectReference(reference)) return new NextResponse('Invalid reference', { status: 400 });
  try {
    const paid = await confirmKonnectPayment(reference);
    if (req.headers.get('accept')?.includes('text/html')) {
      return NextResponse.redirect(new URL(paid ? '/recommendations' : '/subscribe?country=TN&pending=1', env.APP_URL), 303);
    }
    return NextResponse.json({ confirmed: paid }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[billing] Konnect confirmation failed', error instanceof Error ? error.message : 'unknown error');
    return new NextResponse('Confirmation unavailable', { status: 503 });
  }
}
