-- Track whether a stub Telegram account is awaiting email verification.
-- Set to TRUE when the OTP is sent, cleared to FALSE when the user clicks
-- the magic link and session-from-supabase issues a NextAuth session.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_unverified boolean NOT NULL DEFAULT false;
