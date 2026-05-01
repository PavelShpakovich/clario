import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import {
  renderResetPasswordHtml,
  RESET_PASSWORD_SUBJECT,
} from '@/lib/email/templates/reset-password';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

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

  const { email, source } = body.data;
  const isMobile = source === 'mobile';

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: isMobile
        ? `${env.NEXT_PUBLIC_APP_URL}/auth/callback?source=mobile`
        : `${env.NEXT_PUBLIC_APP_URL}/set-password`,
    },
  });

  if (error || !data?.properties?.action_link) {
    // Log internally but return success to the client — never reveal whether
    // an email address is registered.
    logger.error({ error, email }, 'Failed to generate password reset link');
    return NextResponse.json({ success: true });
  }

  // Wrap the Supabase one-time verify URL in a bounce page on our domain.
  // This prevents Microsoft Safe Links from pre-fetching the Supabase endpoint
  // (which would consume the token before the user clicks), causing otp_expired.
  // The bounce page uses only JS to navigate — no plain <a href> to Supabase.
  const encodedLink = Buffer.from(data.properties.action_link).toString('base64url');
  const bounceUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-confirm?u=${encodedLink}`;

  await sendEmail({
    to: email,
    subject: RESET_PASSWORD_SUBJECT,
    html: renderResetPasswordHtml({ resetUrl: bounceUrl }),
  });

  return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rl) });
});
