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

  return NextResponse.json({ reports: data ?? [] });
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

  // Charge credits (respects free-product flag)
  try {
    await chargeForProduct(user.id, 'compatibility_report');
  } catch (err) {
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

  const report = await createPendingCompatibility(
    user.id,
    primaryChartId,
    secondaryChartId,
    compatibilityType,
  );

  return NextResponse.json({ report }, { status: 201 });
});
