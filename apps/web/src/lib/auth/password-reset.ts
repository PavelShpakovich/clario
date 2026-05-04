import crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory storage for OTP verification
// In production, use Redis or database
const otpStore = new Map<string, { otp: string; hash: string; expiresAt: number }>();
const resetTokenStore = new Map<string, { email: string; expiresAt: number }>();

/**
 * Generates a 6-digit OTP for password reset
 */
function generateOtp(): string {
  return crypto.randomInt(0, 1000000).toString().padStart(OTP_LENGTH, '0');
}

/**
 * Hashes an OTP using SHA-256
 */
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Issues a password reset OTP token
 */
export async function issuePasswordResetToken(email: string): Promise<{ otp: string }> {
  const otp = generateOtp();
  const hash = hashOtp(otp);
  const expiresAt = Date.now() + OTP_TTL_MS;

  otpStore.set(email.toLowerCase(), { otp, hash, expiresAt });

  // Clean up after TTL
  setTimeout(() => {
    otpStore.delete(email.toLowerCase());
  }, OTP_TTL_MS);

  return { otp };
}

/**
 * Verifies and consumes a password reset OTP
 */
export async function consumePasswordResetToken(
  email: string,
  otp: string,
): Promise<{ valid: boolean; resetToken?: string }> {
  const otpHash = hashOtp(otp);
  const normalizedEmail = email.toLowerCase();
  const stored = otpStore.get(normalizedEmail);

  if (!stored || Date.now() > stored.expiresAt) {
    return { valid: false };
  }

  if (stored.hash !== otpHash) {
    return { valid: false };
  }

  // Mark as used by deleting
  otpStore.delete(normalizedEmail);

  // Generate a temporary reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  resetTokenStore.set(resetToken, { email: normalizedEmail, expiresAt: tokenExpiry });

  // Clean up after TTL
  setTimeout(
    () => {
      resetTokenStore.delete(resetToken);
    },
    10 * 60 * 1000,
  );

  return { valid: true, resetToken };
}

/**
 * Validates a reset token and returns the associated email
 */
export async function validateResetToken(resetToken: string): Promise<string | null> {
  const stored = resetTokenStore.get(resetToken);

  if (!stored || Date.now() > stored.expiresAt) {
    return null;
  }

  return stored.email;
}

/**
 * Cleans up expired reset tokens and sessions
 */
export async function cleanupExpiredResetTokens(): Promise<void> {
  const now = Date.now();

  // Clean up expired OTP store
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }

  // Clean up expired reset token store
  for (const [token, data] of resetTokenStore.entries()) {
    if (now > data.expiresAt) {
      resetTokenStore.delete(token);
    }
  }
}
