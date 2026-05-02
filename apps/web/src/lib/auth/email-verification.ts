import 'server-only';

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

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
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('email_verification_tokens').upsert(
    {
      user_id: input.userId,
      email: input.email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      consumed_at: null,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw error;
  }

  return token;
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

export async function consumeEmailVerificationToken(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  const now = new Date().toISOString();
  const tokenHash = sha256(token);

  const { data: row, error: consumeError } = await supabaseAdmin
    .from('email_verification_tokens')
    .update({ consumed_at: now })
    .eq('token_hash', tokenHash)
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
