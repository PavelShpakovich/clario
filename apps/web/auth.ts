import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

/**
 * Get server session - use in Server Components and API routes
 */
export async function auth(): Promise<Session | null> {
  try {
    return (await getServerSession(authOptions)) as Session | null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isJwtDecryptError =
      message.includes('decryption operation failed') || message.includes('JWEDecryptionFailed');

    if (isJwtDecryptError) {
      return null;
    }

    throw error;
  }
}
