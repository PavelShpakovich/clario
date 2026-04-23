import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBalance } from '@/lib/credits/service';

const uuidSchema = z.string().uuid();

async function getUserId(ctx: unknown): Promise<string | undefined> {
  const routeContext = ctx as { params?: Promise<{ userId: string }> } | undefined;
  return routeContext?.params ? (await routeContext.params).userId : undefined;
}

export const GET = withApiHandler(async (req: Request, ctx) => {
  await requireAdmin();
  const userId = await getUserId(ctx);

  if (!userId || !uuidSchema.safeParse(userId).success) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '50', 10)),
  );
  const offset = (page - 1) * pageSize;

  const [balance, { data: transactions, count, error }] = await Promise.all([
    getBalance(userId),
    supabaseAdmin
      .from('credit_transactions')
      .select('id, amount, balance_after, reason, reference_type, reference_id, note, created_at', {
        count: 'exact',
      })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1),
  ]);

  if (error) throw error;

  return NextResponse.json({
    balance: balance.balance,
    forecastAccessUntil: balance.forecastAccessUntil?.toISOString() ?? null,
    transactions: transactions ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
});
