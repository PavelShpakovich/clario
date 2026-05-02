import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { chartCreateSchema } from '@/lib/astrology/chart-schema';
import { createChart } from '@/lib/astrology/chart-service';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { normalizeCreateChartBirthTime, resolveChartTimezone } from '@clario/validation';

const db = supabaseAdmin;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  const { data: charts, error } = await db
    .from('charts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!charts || charts.length === 0) return NextResponse.json({ charts: [] });

  // Attach Big Three (Sun/Moon/ASC) for each chart via latest snapshot
  const chartIds = charts.map((c) => c.id);
  const bigThreeMap: Record<string, { sun?: string; moon?: string; asc?: string }> = {};

  const { data: snapshots } = await db
    .from('chart_snapshots')
    .select('id, chart_id, snapshot_version')
    .in('chart_id', chartIds)
    .order('snapshot_version', { ascending: false });

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

  const chartsWithBigThree = charts.map((c) => ({
    ...c,
    big_three: bigThreeMap[c.id] ?? null,
  }));

  return NextResponse.json({ charts: chartsWithBigThree });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const rl = checkRateLimit(`chart-create:${user.id}`, 10, 60 * 60 * 1000); // 10 per hour per user
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many chart creation attempts. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const json = await req.json();
  const parsed = chartCreateSchema.safeParse({
    ...json,
    birthTime: normalizeCreateChartBirthTime(json.birthTimeKnown ?? true, json.birthTime),
    timezone: resolveChartTimezone(json.timezone, json.country),
  });

  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const result = await createChart(user.id, parsed.data);

  return NextResponse.json(
    {
      chart: result.chart,
      snapshot: result.snapshot,
    },
    { status: 201 },
  );
});
