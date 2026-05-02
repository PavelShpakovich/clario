import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users
 * Paginated list of all users with per-user usage stats.
 * Query params:
 *  - page: page number (default 1, 1-indexed)
 *  - perPage: items per page (default 20, max 100)
 */
export const GET = withApiHandler(async (req: Request) => {
  await requireAdmin();

  const url = new URL(req.url);
  const pageStr = url.searchParams.get('page') ?? '1';
  const perPageStr = url.searchParams.get('perPage') ?? '20';

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(perPageStr, 10) || 20));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage,
      page,
    });

    if (usersError || !usersData) {
      logger.error({ error: usersError }, 'Failed to list users');
      return NextResponse.json({ error: 'Не удалось загрузить пользователей' }, { status: 500 });
    }

    const userIds = usersData.users.map((u) => u.id);

    const [
      { data: profiles },
      { data: allCharts },
      { data: monthCharts },
      { data: allReadings },
      { data: monthReadings },
      { data: creditRows },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, display_name, is_admin').in('id', userIds),
      supabaseAdmin.from('charts').select('user_id').in('user_id', userIds),
      supabaseAdmin
        .from('charts')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
      supabaseAdmin.from('readings').select('user_id').in('user_id', userIds),
      supabaseAdmin
        .from('readings')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart),
      supabaseAdmin.from('user_credits').select('user_id, balance').in('user_id', userIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const creditMap = new Map((creditRows ?? []).map((r) => [r.user_id, r.balance as number]));

    type UserTotals = {
      totalReadings: number;
      totalCharts: number;
      readingsThisMonth: number;
      chartsThisMonth: number;
    };

    const metricsMap = new Map<string, UserTotals>();
    const getOrInit = (uid: string): UserTotals => {
      if (!metricsMap.has(uid)) {
        metricsMap.set(uid, {
          totalReadings: 0,
          totalCharts: 0,
          readingsThisMonth: 0,
          chartsThisMonth: 0,
        });
      }
      return metricsMap.get(uid)!;
    };

    for (const row of allCharts ?? []) {
      const metrics = getOrInit(row.user_id);
      metrics.totalCharts += 1;
    }

    for (const row of monthCharts ?? []) {
      const metrics = getOrInit(row.user_id);
      metrics.chartsThisMonth += 1;
    }

    for (const row of allReadings ?? []) {
      const metrics = getOrInit(row.user_id);
      metrics.totalReadings += 1;
    }

    for (const row of monthReadings ?? []) {
      const metrics = getOrInit(row.user_id);
      metrics.readingsThisMonth += 1;
    }

    const enrichedUsers = usersData.users.map((authUser) => {
      const profile = profileMap.get(authUser.id);
      const usage = metricsMap.get(authUser.id) ?? {
        totalReadings: 0,
        totalCharts: 0,
        readingsThisMonth: 0,
        chartsThisMonth: 0,
      };

      return {
        id: authUser.id,
        email: authUser.email ?? null,
        displayName: profile?.display_name || 'Unknown',
        isAdmin: profile?.is_admin || false,
        isEmailVerified: Boolean(authUser.email_confirmed_at),
        accessMode: 'direct',
        createdAt: authUser.created_at,
        totalReadings: usage.totalReadings,
        totalCharts: usage.totalCharts,
        readingsThisMonth: usage.readingsThisMonth,
        chartsThisMonth: usage.chartsThisMonth,
        creditBalance: creditMap.get(authUser.id) ?? 0,
      };
    });

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        perPage,
        total: usersData.total ?? usersData.users.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Admin users endpoint error');
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
});
