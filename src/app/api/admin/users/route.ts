import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

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

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, is_admin')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const enrichedUsers = usersData.users.map((authUser) => {
      const email = authUser.email ?? null;
      const profile = profileMap.get(authUser.id);

      return {
        id: authUser.id,
        email,
        displayName: profile?.display_name || 'Unknown',
        isAdmin: profile?.is_admin || false,
        isEmailVerified: Boolean(authUser.email_confirmed_at),
        accessMode: 'direct',
        createdAt: authUser.created_at,
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
