import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError, InsufficientCreditsError } from '@/lib/errors';
import { createPendingCompatibility, COMPATIBILITY_TYPES } from '@/lib/compatibility/service';
import { chargeForProduct } from '@/lib/credits/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

const createSchema = z.object({
  primaryChartId: z.string().uuid(),
  secondaryChartId: z.string().uuid(),
  compatibilityType: z.enum(COMPATIBILITY_TYPES).default('romantic'),
});

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  const { data, error } = await db
    .from('compatibility_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const reports = data ?? [];

  // Attach person names for primary/secondary charts
  const chartIds = [...new Set(reports.flatMap((r) => [r.primary_chart_id, r.secondary_chart_id]))];
  const chartMap: Record<string, string> = {};
  if (chartIds.length > 0) {
    const { data: charts } = await db.from('charts').select('id, person_name').in('id', chartIds);
    for (const c of charts ?? []) chartMap[c.id] = c.person_name;
  }

  const enriched = reports.map((r) => ({
    ...r,
    primary_person_name: chartMap[r.primary_chart_id] ?? null,
    secondary_person_name: chartMap[r.secondary_chart_id] ?? null,
  }));

  return NextResponse.json({ reports: enriched });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ValidationError({ message: parsed.error.issues.map((i) => i.message).join(', ') });
  }

  const { primaryChartId, secondaryChartId, compatibilityType } = parsed.data;
  if (primaryChartId === secondaryChartId) {
    throw new ValidationError({ message: 'Primary and secondary charts must be different' });
  }

  const report = await createPendingCompatibility(
    user.id,
    primaryChartId,
    secondaryChartId,
    compatibilityType,
  );

  // Charge credits (respects free-product flag)
  try {
    await chargeForProduct(user.id, 'compatibility_report', { referenceId: report.id });
  } catch (err) {
    await db.from('compatibility_reports').delete().eq('id', report.id).eq('user_id', user.id);
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          required: (err.context.required as number) ?? 0,
          balance: (err.context.balance as number) ?? 0,
        },
        { status: 402 },
      );
    }
    throw err;
  }

  return NextResponse.json({ report }, { status: 201 });
});
