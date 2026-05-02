import { supabaseAdmin } from '@/lib/supabase/admin';

export type AccountIdentityProvider = 'supabase';

export async function ensureSupabaseIdentityLink(
  userId: string,
  email?: string | null,
): Promise<void> {
  const { error: upsertError } = await supabaseAdmin.from('account_identities').upsert(
    {
      user_id: userId,
      provider: 'supabase',
      provider_user_id: userId,
      provider_email: email ?? null,
      metadata: {
        source: 'auth_runtime',
      },
    },
    { onConflict: 'provider,provider_user_id' },
  );

  if (upsertError) {
    throw upsertError;
  }

  const { data: identity, error: identityError } = await supabaseAdmin
    .from('account_identities')
    .select('user_id')
    .eq('provider', 'supabase')
    .eq('provider_user_id', userId)
    .maybeSingle<{ user_id: string }>();

  if (identityError) {
    throw identityError;
  }

  if (!identity || identity.user_id !== userId) {
    throw new Error('Supabase identity is already linked to another account');
  }
}
