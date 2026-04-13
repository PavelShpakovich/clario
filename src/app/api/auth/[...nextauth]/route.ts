import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

const handler = NextAuth(authOptions);

async function rateLimitedPost(req: NextRequest, ctx: unknown) {
  // Only rate-limit credential sign-in attempts (callback/credentials)
  if (req.nextUrl.pathname.endsWith('/callback/password')) {
    const ip = getClientIp(req);
    const rl = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000); // 5 attempts per 15 min
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }
  }
  return (handler as (req: NextRequest, ctx: unknown) => Promise<Response>)(req, ctx);
}

export { handler as GET, rateLimitedPost as POST };
