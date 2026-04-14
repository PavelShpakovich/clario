import 'server-only';

import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email/resend';
import { renderVerifyEmailHtml, VERIFY_EMAIL_SUBJECT } from '@/lib/email/templates/verify-email';
import { issueEmailVerificationToken } from '@/lib/auth/email-verification';

export async function sendVerificationEmail({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<void> {
  const token = await issueEmailVerificationToken({ userId, email });
  const confirmUrl = `${env.NEXT_PUBLIC_APP_URL}/api/auth/confirm?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: VERIFY_EMAIL_SUBJECT,
    html: renderVerifyEmailHtml({ confirmUrl }),
  });
}
