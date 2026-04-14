import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { ChartsOverview, type BigThree } from '@/components/astrology/charts-overview';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function generateMetadata() {
  const t = await getTranslations('workspace');
  return { title: t('chartsPageTitle'), description: t('chartsPageDescription') };
}

const db = supabaseAdmin;

export default async function ChartsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [{ data: charts }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    db.from('profiles').select('onboarding_completed_at').eq('id', session.user.id).maybeSingle(),
  ]);

  const needsOnboarding = !profile?.onboarding_completed_at;
  const chartIds = (charts ?? []).map((c) => c.id);

  // Fetch latest snapshot per chart (3-query approach, no N+1)
  const bigThreeMap: Record<string, BigThree> = {};

  if (chartIds.length > 0) {
    const { data: snapshots } = await db
      .from('chart_snapshots')
      .select('id, chart_id, snapshot_version')
      .in('chart_id', chartIds)
      .order('snapshot_version', { ascending: false });

    // Keep only the latest snapshot per chart
    const latestSnapshotIds: string[] = [];
    const snapshotToChart: Record<string, string> = {};
    const seen = new Set<string>();
    for (const snap of snapshots ?? []) {
      if (!seen.has(snap.chart_id)) {
        seen.add(snap.chart_id);
        latestSnapshotIds.push(snap.id);
        snapshotToChart[snap.id] = snap.chart_id;
      }
    }

    if (latestSnapshotIds.length > 0) {
      const { data: positions } = await db
        .from('chart_positions')
        .select('chart_snapshot_id, body_key, sign_key')
        .in('chart_snapshot_id', latestSnapshotIds)
        .in('body_key', ['sun', 'moon', 'ascendant']);

      for (const pos of positions ?? []) {
        const chartId = snapshotToChart[pos.chart_snapshot_id];
        if (!chartId) continue;
        if (!bigThreeMap[chartId]) bigThreeMap[chartId] = {};
        if (pos.body_key === 'sun') bigThreeMap[chartId].sun = pos.sign_key;
        if (pos.body_key === 'moon') bigThreeMap[chartId].moon = pos.sign_key;
        if (pos.body_key === 'ascendant') bigThreeMap[chartId].asc = pos.sign_key;
      }
    }
  }

  return (
    <ChartsOverview
      charts={charts ?? []}
      needsOnboarding={needsOnboarding}
      bigThreeMap={bigThreeMap}
    />
  );
}
