import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findAuthUserByEmail } from '@/lib/auth/user-accounts';
import { consumeEmailVerificationToken } from '@/lib/auth/email-verification';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const POST = withApiHandler(async (req) => {
  const ip = getClientIp(req);
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { email, otp } = body.data;
  const email_lower = email.toLowerCase();

  // Rate limit: 5 attempts per email per 15 minutes
  const rl = checkRateLimit(`verify-otp:${email_lower}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many verification attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  // Find user by email
  const user = await findAuthUserByEmail(email_lower);
  if (!user) {
    // Return generic error to avoid leaking user existence
    return NextResponse.json({ error: 'Invalid OTP or email not found' }, { status: 400 });
  }

  // If already verified, return success
  if (user.emailConfirmedAt) {
    return NextResponse.json({ success: true });
  }

  // Validate and consume the OTP token
  const payload = await consumeEmailVerificationToken(otp);
  if (!payload || payload.email.toLowerCase() !== email_lower) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
  }

  // Mark user as email confirmed
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
    email_confirm: true,
  });

  if (updateError) {
    return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
