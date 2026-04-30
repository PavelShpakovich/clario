import { supabaseAdmin } from '@/lib/supabase/admin';

export type AccountIdentityProvider = 'supabase';

export async function ensureSupabaseIdentityLink(
  userId: string,
  email?: string | null,
): Promise<void> {
  const { data: existingIdentity, error: existingError } = await supabaseAdmin
    .from('account_identities')
    .select('user_id')
    .eq('provider', 'supabase')
    .eq('provider_user_id', userId)
    .maybeSingle<{ user_id: string }>();

  if (existingError) {
    throw existingError;
  }

  if (existingIdentity && existingIdentity.user_id !== userId) {
    throw new Error('Supabase identity is already linked to another account');
  }

  if (!existingIdentity) {
    const { error: insertError } = await supabaseAdmin.from('account_identities').insert({
      user_id: userId,
      provider: 'supabase',
      provider_user_id: userId,
      provider_email: email ?? null,
      metadata: {
        source: 'auth_runtime',
      },
    });

    if (insertError) {
      throw insertError;
    }
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('account_identities')
    .update({ provider_email: email ?? null })
    .eq('provider', 'supabase')
    .eq('provider_user_id', userId);

  if (updateError) {
    throw updateError;
  }
}
