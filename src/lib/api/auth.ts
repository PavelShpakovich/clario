import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auth } from '@/auth';
import { AuthError } from '@/lib/errors';

/**
 * Retrieves and validates the current authenticated user from the request cookies.
 * Throws AuthError if the session is missing or invalid.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: supabaseUser },
    error: supabaseAuthError,
  } = await supabase.auth.getUser();

  if (supabaseUser) {
    return { user: supabaseUser, supabase };
  }

  const session = await auth();
  const nextAuthUserId = session?.user?.id;

  if (nextAuthUserId) {
    return {
      user: { id: nextAuthUserId },
      supabase: supabaseAdmin,
    };
  }

  throw new AuthError({ message: 'Authentication required', cause: supabaseAuthError });
}
