import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeHouseSystem } from '@/lib/astrology/constants';
import { ChartIntakeForm } from '@/components/astrology/chart-intake-form';

const db = supabaseAdmin;

export default async function EditChartPage({ params }: { params: Promise<{ chartId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { chartId } = await params;

  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!chart) notFound();

  return (
    <ChartIntakeForm
      mode="edit"
      chartId={chartId}
      initialData={{
        label: chart.label,
        personName: chart.person_name,
        subjectType: chart.subject_type,
        birthDate: chart.birth_date,
        birthTime: chart.birth_time ?? undefined,
        birthTimeKnown: chart.birth_time_known,
        city: chart.city,
        country: chart.country,
        timezone: chart.timezone ?? undefined,
        latitude: chart.latitude != null ? String(chart.latitude) : undefined,
        longitude: chart.longitude != null ? String(chart.longitude) : undefined,
        houseSystem: normalizeHouseSystem(chart.house_system),
        notes: chart.notes ?? undefined,
      }}
    />
  );
}
