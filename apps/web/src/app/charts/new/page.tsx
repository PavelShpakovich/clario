import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeHouseSystem } from '@/lib/astrology/constants';
import { ChartIntakeForm } from '@/components/astrology/chart-intake-form';

export async function generateMetadata() {
  const t = await getTranslations('chartForm');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

const db = supabaseAdmin;

export default async function NewChartPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Load user's profile defaults and last chart for pre-fill
  const [{ data: profile }, { data: lastChart }] = await Promise.all([
    db
      .from('profiles')
      .select('display_name, locale, timezone')
      .eq('id', session.user.id)
      .maybeSingle(),
    db
      .from('charts')
      .select('city, country, timezone, latitude, longitude, house_system')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const defaults = {
    personName: profile?.display_name ?? session.user.name ?? '',
    timezone: lastChart?.timezone ?? profile?.timezone ?? '',
    city: lastChart?.city ?? '',
    country: lastChart?.country ?? '',
    latitude: lastChart?.latitude ? String(lastChart.latitude) : '',
    longitude: lastChart?.longitude ? String(lastChart.longitude) : '',
    houseSystem: normalizeHouseSystem(lastChart?.house_system),
  };

  return <ChartIntakeForm defaults={defaults} />;
}
