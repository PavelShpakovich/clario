import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { createPendingCompatibility } from '@/lib/compatibility/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

const createSchema = z.object({
  primaryChartId: z.string().uuid(),
  secondaryChartId: z.string().uuid(),
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

  const { primaryChartId, secondaryChartId } = parsed.data;
  if (primaryChartId === secondaryChartId) {
    throw new ValidationError({ message: 'Primary and secondary charts must be different' });
  }

  const report = await createPendingCompatibility(user.id, primaryChartId, secondaryChartId);

  return NextResponse.json({ report }, { status: 201 });
});
