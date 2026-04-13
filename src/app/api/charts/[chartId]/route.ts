import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

const uuidSchema = z.string().uuid();

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ chartId: string }> } | undefined;
  const chartId = routeContext?.params ? (await routeContext.params).chartId : undefined;

  if (!chartId) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  if (!uuidSchema.safeParse(chartId).success) {
    throw new ValidationError({ message: 'Invalid chart ID format' });
  }

  const [{ data: chart }, { data: snapshots }] = await Promise.all([
    db.from('charts').select('*').eq('id', chartId).eq('user_id', user.id).maybeSingle(),
    db
      .from('chart_snapshots')
      .select('*')
      .eq('chart_id', chartId)
      .order('snapshot_version', { ascending: false }),
  ]);

  if (!chart) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  const snapshotIds = (snapshots ?? []).map((snapshot) => snapshot.id);
  const [{ data: positions }, { data: aspects }] = await Promise.all([
    snapshotIds.length > 0
      ? db.from('chart_positions').select('*').in('chart_snapshot_id', snapshotIds)
      : Promise.resolve({ data: [] }),
    snapshotIds.length > 0
      ? db.from('chart_aspects').select('*').in('chart_snapshot_id', snapshotIds)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    chart,
    snapshots: snapshots ?? [],
    positions: positions ?? [],
    aspects: aspects ?? [],
  });
});
