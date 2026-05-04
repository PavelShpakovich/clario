import 'server-only';

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const EMAIL_VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 minutes for OTP

type EmailVerificationTokenRow = {
  id: string;
  user_id: string;
  email: string;
  expires_at: string;
  consumed_at: string | null;
};

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function issueEmailVerificationToken(input: {
  userId: string;
  email: string;
}): Promise<string> {
  // Generate 6-digit OTP
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const otpHash = sha256(otp);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('email_verification_tokens').upsert(
    {
      user_id: input.userId,
      email: input.email,
      token_hash: otpHash, // Store hash of OTP, not the OTP itself
      expires_at: expiresAt,
      consumed_at: null,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw error;
  }

  // Return plain OTP to be sent in email
  return otp;
}

export async function findEmailVerificationToken(
  token: string,
): Promise<EmailVerificationTokenRow | null> {
  const tokenHash = sha256(token);

  const { data: row, error } = await supabaseAdmin
    .from('email_verification_tokens')
    .select('id, user_id, email, expires_at, consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle<EmailVerificationTokenRow>();

  if (error) {
    throw error;
  }

  return row;
}

export async function consumeEmailVerificationToken(otp: string): Promise<{
  userId: string;
  email: string;
} | null> {
  const now = new Date().toISOString();
  // Hash the plain OTP to match against stored hash
  const otpHash = sha256(otp);

  const { data: row, error: consumeError } = await supabaseAdmin
    .from('email_verification_tokens')
    .update({ consumed_at: now })
    .eq('token_hash', otpHash)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select('user_id, email')
    .maybeSingle<{ user_id: string; email: string }>();

  if (consumeError) {
    throw consumeError;
  }

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    email: row.email,
  };
}

export async function clearEmailVerificationTokensForUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_verification_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
