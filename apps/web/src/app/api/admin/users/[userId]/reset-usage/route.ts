import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const db = supabaseAdmin;

/**
 * POST /api/admin/users/[userId]/reset-usage
 * Resets all usage counters for the given user in the current month period.
 * Admin-only.
 */
export const POST = withApiHandler(async (_req: Request, ctx?: unknown) => {
  await requireAdmin();

  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { userId } = (await params) || {};

  if (!userId || typeof userId !== 'string') {
    throw new ValidationError({ message: 'userId is required' });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { error } = await db
    .from('usage_counters')
    .update({
      readings_generated: 0,
      charts_created: 0,
      follow_up_messages_used: 0,
      forecasts_generated: 0,
      compatibility_reports_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .gte('period_start', monthStart);

  if (error) {
    logger.error({ error, userId }, 'Failed to reset usage counters');
    return NextResponse.json({ error: 'Не удалось сбросить счётчики' }, { status: 500 });
  }

  logger.info({ userId }, 'Usage counters reset by admin');
  return NextResponse.json({ success: true });
});
