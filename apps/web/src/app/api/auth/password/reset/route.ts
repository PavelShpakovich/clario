import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { sendEmail } from '@/lib/email/resend';
import {
  renderPasswordResetOtpHtml,
  RESET_PASSWORD_SUBJECT,
} from '@/lib/email/templates/reset-password';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { issuePasswordResetToken } from '@/lib/auth/password-reset';
import { findAuthUserByEmail } from '@/lib/auth/user-accounts';

const bodySchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export const POST = withApiHandler(async (req) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`password-reset:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { email } = body.data;

  // Check if user exists (but don't reveal whether they do)
  try {
    const user = await findAuthUserByEmail(email);
    if (!user) {
      // User doesn't exist, but return success anyway to avoid leaking emails
      logger.info({ email }, 'Password reset requested for non-existent user');
      return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
    }
  } catch (err) {
    logger.info({ email }, 'Error checking if user exists for password reset');
    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  }

  try {
    const { otp } = await issuePasswordResetToken(email);

    await sendEmail({
      to: email,
      subject: RESET_PASSWORD_SUBJECT,
      html: renderPasswordResetOtpHtml({ otp }),
    });

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  } catch (error) {
    logger.error({ error, email }, 'Failed to send password reset OTP');
    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
  }
});
