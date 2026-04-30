import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidatePricingCache } from '@/lib/credits/pricing';

export const GET = withApiHandler(async () => {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('report_products')
    .select('id, kind, title, credit_cost, free')
    .order('kind');

  if (error) throw error;

  return NextResponse.json({ products: data });
});

const updateSchema = z.object({
  productId: z.string().min(1),
  creditCost: z.number().int().min(0).max(100).optional(),
  free: z.boolean().optional(),
});

export const PATCH = withApiHandler(async (req: Request) => {
  await requireAdmin();

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 422 },
    );
  }

  const { productId, creditCost, free } = parsed.data;

  // Build the update payload with only fields that were provided
  const updates = {
    updated_at: new Date().toISOString(),
    ...(creditCost !== undefined ? { credit_cost: creditCost } : {}),
    ...(free !== undefined ? { free } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from('report_products')
    .update(updates)
    .eq('id', productId)
    .select('id, kind, title, credit_cost, free')
    .single();

  if (error) throw error;

  invalidatePricingCache();

  return NextResponse.json({ success: true, product: data });
});
