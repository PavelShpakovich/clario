import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';
import { findAuthUserByEmail } from '@/lib/auth/user-accounts';
import { sendVerificationEmail } from '@/lib/email/send-verification';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { addCredits } from '@/lib/credits/service';
import { INITIAL_CREDIT_GRANT } from '@/lib/usage-policy';
import { logger } from '@/lib/logger';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const POST = withApiHandler(async (req) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`register:${ip}`, 3, 60 * 60 * 1000); // 3 per hour per IP
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const email = body.data.email.trim().toLowerCase();
  const password = body.data.password;

  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    if (existingUser.emailConfirmedAt) {
      // Confirmed account already exists — tell the client to sign in instead.
      throw new ValidationError({ message: 'An account with this email already exists' });
    }
    // Unconfirmed account exists — resend the verification email and let the
    // client show the "check your inbox" state again.
    await sendVerificationEmail({ userId: existingUser.id, email });
    return NextResponse.json({ success: true, needsVerification: true });
  }

  // Create the user without auto-confirming — we send our own email via Resend.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { source: 'web' },
  });

  if (error || !data.user) {
    throw new ValidationError({ message: error?.message || 'Failed to create account' });
  }

  await ensureSupabaseIdentityLink(data.user.id, email);

  const displayName = deriveDisplayNameFromEmail(email);
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: data.user.id,
      display_name: displayName,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    throw profileError;
  }

  // Grant welcome credits — best-effort, never fail registration
  try {
    await addCredits(data.user.id, INITIAL_CREDIT_GRANT, 'welcome_bonus', {
      note: 'Welcome bonus on registration',
    });
  } catch (err) {
    logger.error({ error: err, userId: data.user.id }, 'Failed to grant welcome credits');
  }

  await sendVerificationEmail({ userId: data.user.id, email });

  return NextResponse.json({ success: true, needsVerification: true });
});
