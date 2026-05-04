import 'server-only';

import { sendEmail } from '@/lib/email/resend';
import { renderVerifyEmailHtml, VERIFY_EMAIL_SUBJECT } from '@/lib/email/templates/verify-email';
import { issueEmailVerificationToken } from '@/lib/auth/email-verification';

export async function sendVerificationEmail({
  userId,
  email,
  source,
}: {
  userId: string;
  email: string;
  source?: string;
}): Promise<void> {
  const otp = await issueEmailVerificationToken({ userId, email });

  await sendEmail({
    to: email,
    subject: VERIFY_EMAIL_SUBJECT,
    html: renderVerifyEmailHtml({ otp }),
  });
}
