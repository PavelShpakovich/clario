import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const GET = withApiHandler(async (req: Request) => {
  const { user } = await requireAuth();
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)),
  );
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabaseAdmin
    .from('credit_transactions')
    .select('id, amount, balance_after, reason, reference_type, reference_id, note, created_at', {
      count: 'exact',
    })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return NextResponse.json({
    transactions: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  });
});
