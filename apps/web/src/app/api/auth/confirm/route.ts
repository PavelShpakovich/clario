import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  consumeEmailVerificationToken,
  findEmailVerificationToken,
} from '@/lib/auth/email-verification';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/auth/confirm?token=...
 *
 * Called when a user clicks the email verification link we send via Resend.
 * Validates the application-managed token, confirms the auth user, and
 * redirects to the login page.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const source = searchParams.get('source');
  const isMobile = source === 'mobile';

  const appUrl = env.NEXT_PUBLIC_APP_URL;

  function redirectSuccess() {
    if (isMobile) return NextResponse.redirect(new URL('clario://login?verified=true'));
    return NextResponse.redirect(new URL('/login?callbackUrl=/onboarding', appUrl));
  }

  function redirectError() {
    if (isMobile) return NextResponse.redirect(new URL('clario://login?verified=error'));
    return NextResponse.redirect(new URL('/login?verified=error', appUrl));
  }

  if (!token) return redirectError();

  const tokenRow = await findEmailVerificationToken(token);
  if (!tokenRow) return redirectError();

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(tokenRow.user_id);
  if (error || !data.user || data.user.email?.toLowerCase() !== tokenRow.email.toLowerCase()) {
    return redirectError();
  }

  if (data.user.email_confirmed_at) {
    return redirectSuccess();
  }

  const payload = await consumeEmailVerificationToken(token);
  if (!payload) {
    const { data: refreshedData, error: refreshedError } =
      await supabaseAdmin.auth.admin.getUserById(tokenRow.user_id);

    if (!refreshedError && refreshedData.user?.email_confirmed_at) {
      return redirectSuccess();
    }

    return redirectError();
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
    email_confirm: true,
  });

  if (updateError) return redirectError();

  return redirectSuccess();
}
