import { NextResponse, type NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

// Security headers on every response. Auth is checked in pages/actions (needs the DB).
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // React dev tools need eval(); never allowed in production builds
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
        : "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data:",
      "img-src 'self' https: data:",
      "connect-src 'self' https://api.stripe.com",
      'frame-src https://js.stripe.com https://hooks.stripe.com',
      "form-action 'self' https:",
      "base-uri 'self'",
    ].join('; ')
  );
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
