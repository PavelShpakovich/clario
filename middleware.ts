import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

  // Use getToken (Edge-compatible) instead of getServerSession (Node.js-only).
  // getServerSession cannot run in the Edge Runtime and causes crypto-related
  // TypeErrors (e.g. "Cannot read properties of undefined (reading 'slice')").
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.SUPABASE_SERVICE_KEY,
  });

  // If user is not authenticated and trying to access protected route
  if (!token) {
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
