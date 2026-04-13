import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUsagePolicy } from '@/lib/usage-policy';
import { logger } from '@/lib/logger';
import { isTelegramStubEmail } from '@/lib/auth/user-accounts';

/**
 * GET /api/admin/users
 * Paginated list of all users with their current workspace usage info.
 * Query params:
 *  - page: page number (default 1, 1-indexed)
 *  - perPage: items per page (default 20, max 100)
 */
export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  const url = new URL(req.url);
  const pageStr = url.searchParams.get('page') ?? '1';
  const perPageStr = url.searchParams.get('perPage') ?? '20';

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(perPageStr, 10) || 20));

  try {
    // Fetch all users using Supabase admin API
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage,
      page,
    });

    if (usersError || !usersData) {
      logger.error({ error: usersError }, 'Failed to list users');
      return NextResponse.json({ error: 'Не удалось загрузить пользователей' }, { status: 500 });
    }

    const userIds = usersData.users.map((u) => u.id);
    const policy = await getUsagePolicy();
    const now = new Date().toISOString();

    // Batch queries: profiles + usage_counters for all users in one go
    const [{ data: profiles }, { data: usages }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, display_name, is_admin').in('id', userIds),
      supabaseAdmin
        .from('usage_counters')
        .select('user_id, charts_created')
        .in('user_id', userIds)
        .lte('period_start', now)
        .gte('period_end', now),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const usageMap = new Map((usages ?? []).map((u) => [u.user_id, u]));

    const enrichedUsers = usersData.users.map((authUser) => {
      const email = isTelegramStubEmail(authUser.email) ? null : (authUser.email ?? null);
      const profile = profileMap.get(authUser.id);
      const usage = usageMap.get(authUser.id);
      const chartsCreated = usage?.charts_created ?? 0;
      const chartsRemaining = Math.max(0, policy.chartsPerPeriod - chartsCreated);

      return {
        id: authUser.id,
        email,
        telegramId: null,
        displayName: profile?.display_name || 'Unknown',
        isAdmin: profile?.is_admin || false,
        isEmailVerified: Boolean(authUser.email_confirmed_at),
        accessMode: 'direct',
        chartsLimit: policy.chartsPerPeriod,
        chartsUsed: chartsCreated,
        chartsRemaining,
        createdAt: authUser.created_at,
      };
    });

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        perPage,
        total: usersData.users.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Admin users endpoint error');
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
});
