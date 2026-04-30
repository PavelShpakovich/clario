'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

const GLOW =
  'radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.22 0.06 268 / 50%) 0%, transparent 70%)';

function Spinner() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: GLOW }}
      />
      <Loader2 className="relative z-10 size-8 animate-spin text-muted-foreground" />
    </main>
  );
}

type CallbackState = { kind: 'non-mobile' } | { kind: 'deep-link'; url: string };

/** Parse the current URL once on mount — only runs in the browser. */
function parseCallbackUrl(): CallbackState {
  if (typeof window === 'undefined') return { kind: 'non-mobile' };

  const search = new URLSearchParams(window.location.search);
  if (search.get('source') !== 'mobile') return { kind: 'non-mobile' };

  const hash = window.location.hash;
  const hashStr = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashStr);

  // Supabase puts auth errors (e.g. otp_expired) in the hash fragment.
  // Forward them to the app as-is — it will route to the forgot-password screen.
  if (hashParams.get('error')) {
    return {
      kind: 'deep-link',
      url: `clario://auth/callback?error=${encodeURIComponent(hashParams.get('error')!)}`,
    };
  }

  const code = search.get('code');
  let url: string;
  if (hashStr) {
    // Token flow (implicit): convert hash fragment to query params.
    // iOS strips URL fragments from deep links, so tokens must be in the query string.
    url = `clario://auth/callback?${hashStr}`;
  } else if (code) {
    // PKCE flow: forward the code to the mobile app.
    url = `clario://auth/callback?code=${code}`;
  } else {
    url = 'clario://auth/callback';
  }
  return { kind: 'deep-link', url };
}

function CallbackHandler() {
  const router = useRouter();
  const t = useTranslations('auth');

  // Derived entirely from the URL — no setState in effects.
  const [state] = useState<CallbackState>(parseCallbackUrl);

  // Effect is for side-effects only: navigate away or trigger the deep link.
  useEffect(() => {
    if (state.kind === 'non-mobile') {
      router.replace('/login');
    } else if (state.kind === 'deep-link') {
      // Attempt automatic redirect — may be blocked by Safari without a user gesture.
      window.location.replace(state.url);
    }
  }, [state, router]);

  if (state.kind === 'deep-link') {
    return (
      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: GLOW }}
        />
        <Loader2 className="relative z-10 size-8 animate-spin text-muted-foreground" />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{t('openingApp')}</p>
          <a
            href={state.url}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('openAppFallback')}
          </a>
        </div>
      </main>
    );
  }

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
