import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { locales, defaultLocale } from '@/i18n/config';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth',
  '/tg', // Telegram callback
];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth', // NextAuth routes
  '/api/auth/telegram', // Telegram auth endpoint
];

function getLocaleFromRequest(request: NextRequest): string {
  // Check for locale in cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && (locales as readonly string[]).includes(localeCookie)) {
    return localeCookie;
  }

  // Check for locale in Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if ((locales as readonly string[]).includes(preferred)) {
      return preferred;
    }
  }

  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API public routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow all public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check session for protected routes
  const session = await auth();

  // If user is not authenticated and trying to access protected route
  if (!session) {
    // If it's an API route, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Otherwise redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public (public files)
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
