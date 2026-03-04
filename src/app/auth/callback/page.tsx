'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

function Spinner() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-gray-500">Completing sign-in…</p>
    </main>
  );
}

/**
 * Landing page for Supabase magic-link emails.
 * Supabase appends ?token_hash=...&type=email to the redirect URL.
 * We exchange it for a session, then redirect to /dashboard.
 */
function CallbackHandler() {
  const params = useSearchParams();

  useEffect(() => {
    async function exchange() {
      const tokenHash = params.get('token_hash');
      const type = params.get('type') as 'email' | 'recovery' | null;

      if (tokenHash && type) {
        const supabase = createSupabaseClient();
        await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      }

      // Hard navigate so Supabase cookies are committed before the
      // middleware processes the next request.
      window.location.href = '/dashboard';
    }

    void exchange();
  }, [params]);

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
