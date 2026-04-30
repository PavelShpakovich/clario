'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/client';
import { authApi } from '@clario/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';

export function SetPasswordForm() {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Use a closure flag so we only call setIsReady once even if both the
    // auth state change event and getSession() resolve with a session.
    let done = false;

    const markReady = (userEmail: string | null | undefined) => {
      if (done) return;
      done = true;
      setEmail(userEmail ?? null);
      setIsReady(true);
    };

    // Subscribe first so we don't miss PASSWORD_RECOVERY / SIGNED_IN that
    // fires as soon as Supabase processes the recovery token from the URL hash.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        markReady(session?.user?.email);
      }
    });

    // Also check for an existing session (e.g. page refresh after the token
    // was already consumed and a session is stored in localStorage).
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady(session.user.email);
    });

    // If neither fires within 5 s the link is expired or the user landed here
    // directly — show the "link expired" state so they can request a new one.
    const timeout = setTimeout(() => markReady(null), 5000);

    return () => {
      done = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error(validation('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(validation('passwordsDoNotMatch'));
      return;
    }

    if (!email) {
      toast.error(t('error'));
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      // The user proved inbox access by clicking the recovery link — confirm
      // their email now so signIn succeeds even if they never verified before.
      const {
        data: { session: recoverySession },
      } = await supabase.auth.getSession();
      if (recoverySession?.access_token) {
        await authApi.confirmPasswordReset(recoverySession.access_token);
      }

      const result = await signIn('password', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        throw new Error(result?.error || t('invalidCredentials'));
      }

      toast.success(t('passwordUpdated'));
      window.location.href = result.url || callbackUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isReady && !email) {
    return (
      <AuthShell
        title={t('setPasswordTitle')}
        description={t('error')}
        footer={
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t('sendResetLink')}
            </Link>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">{t('forgotPasswordDescription')}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('setPasswordTitle')} description={t('setPasswordDescription')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting || !isReady}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting || !isReady}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !isReady}>
          {isSubmitting ? t('saving') : t('setPassword')}
        </Button>
      </form>
    </AuthShell>
  );
}
