import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { consumePasswordResetToken } from '@/lib/auth/password-reset';

const bodySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

/**
 * POST /api/auth/password/verify-otp
 *
 * Verifies a 6-digit OTP for password reset. Returns a temporary reset token
 * that allows the user to update their password.
 */
export const POST = withApiHandler(async (req) => {
  const ip = getClientIp(req);
  const email = req.headers.get('x-email') || (await req.clone().json()).email;
  const rl = checkRateLimit(`password-reset-otp:${email}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { email: bodyEmail, otp } = body.data;

  try {
    const { valid, resetToken } = await consumePasswordResetToken(bodyEmail, otp);

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400, headers: rateLimitHeaders(rl) },
      );
    }

    return NextResponse.json({ success: true, resetToken }, { headers: rateLimitHeaders(rl) });
  } catch (error) {
    logger.error({ error, email: bodyEmail }, 'Failed to verify password reset OTP');
    return NextResponse.json(
      { error: 'Invalid or expired code. Please request a new one.' },
      { status: 400, headers: rateLimitHeaders(rl) },
    );
  }
});
