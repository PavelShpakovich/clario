import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function fetchUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('display_name, streak_count, telegram_id')
    .eq('id', session.user.id)
    .limit(1);
  return profiles?.[0] || null;
}

export async function fetchTheme(themeId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data: themes } = await supabaseAdmin
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .or(`user_id.eq.${session.user.id},is_public.eq.true`)
    .limit(1);
  return themes?.[0] || null;
}
