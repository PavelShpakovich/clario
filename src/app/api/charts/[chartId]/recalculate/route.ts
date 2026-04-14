import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeHouseSystem } from '@/lib/astrology/constants';
import { calculateNatalChart } from '@/lib/astrology/engine';
import { saveChartSnapshot } from '@/lib/astrology/repository';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();

/**
 * POST /api/charts/[chartId]/recalculate
 *
 * Re-runs the astrology engine against the stored birth data and creates
 * a fresh chart snapshot (positions + aspects). The old snapshot is deleted
 * so the latest one always has the correct data.
 */
export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ chartId: string }> } | undefined;
  const chartId = routeContext?.params ? (await routeContext.params).chartId : undefined;

  if (!chartId || !uuidSchema.safeParse(chartId).success) {
    throw new ValidationError({ message: 'Invalid chart ID' });
  }

  // Fetch the chart with its birth data
  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!chart) throw new NotFoundError({ message: 'Chart not found' });

  // Delete existing snapshots (cascades to positions + aspects via FK)
  const { data: existingSnapshots } = await db
    .from('chart_snapshots')
    .select('id')
    .eq('chart_id', chartId);

  if (existingSnapshots && existingSnapshots.length > 0) {
    const snapshotIds = existingSnapshots.map((s) => s.id);
    await db.from('chart_aspects').delete().in('chart_snapshot_id', snapshotIds);
    await db.from('chart_positions').delete().in('chart_snapshot_id', snapshotIds);
    await db.from('chart_snapshots').delete().eq('chart_id', chartId);
  }

  // Re-run the engine
  const computation = await calculateNatalChart({
    label: chart.label,
    personName: chart.person_name,
    subjectType: chart.subject_type as 'self' | 'partner' | 'child' | 'client' | 'other',
    birthDate: chart.birth_date,
    birthTime: chart.birth_time ?? undefined,
    birthTimeKnown: chart.birth_time_known,
    houseSystem: normalizeHouseSystem(chart.house_system),
    notes: chart.notes ?? undefined,
    city: chart.city,
    country: chart.country,
    latitude: chart.latitude ?? undefined,
    longitude: chart.longitude ?? undefined,
    timezone: chart.timezone ?? undefined,
  });

  const snapshot = await saveChartSnapshot(chartId, computation);

  return NextResponse.json({
    ok: true,
    snapshot,
    positionCount: computation.positions.length,
    aspectCount: computation.aspects.length,
    warnings: computation.warnings,
  });
});
