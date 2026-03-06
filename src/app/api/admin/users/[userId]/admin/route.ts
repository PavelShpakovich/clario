import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const toggleAdminSchema = z.object({
  makeAdmin: z.boolean(),
});

/**
 * PUT /api/admin/users/[userId]/admin
 * Admin endpoint to toggle admin status for a user
 * Only users in ADMIN_EMAILS can promote/demote others
 */
export const PUT = withApiHandler(async (req: Request, ctx?: unknown) => {
  const { user } = await requireAuth();

  // Verify admin access — either flagged as admin in the session (NextAuth)
  // or the email appears in the ADMIN_EMAILS env var (Supabase sessions).
  const isCallerAdmin =
    ('isAdmin' in user && user.isAdmin) ||
    (() => {
      if (!env.ADMIN_EMAILS) return false;
      const email = ('email' in user && user.email) || '';
      return env.ADMIN_EMAILS.split(',')
        .map((e) => e.trim())
        .includes(email);
    })();

  if (!isCallerAdmin) {
    return NextResponse.json({ error: 'Only admins can toggle admin status' }, { status: 403 });
  }

  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { userId } = (await params) || {};

  if (!userId || typeof userId !== 'string') {
    throw new ValidationError({ message: 'userId is required' });
  }

  // Validate request body
  const body = toggleAdminSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { makeAdmin } = body.data;

  try {
    // Update profile
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: makeAdmin })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    logger.info({ superAdminId: user.id, userId, makeAdmin }, 'Admin status toggled');

    return NextResponse.json({
      success: true,
      message: `User ${makeAdmin ? 'promoted to' : 'demoted from'} admin`,
      userId,
      makeAdmin,
    });
  } catch (error) {
    logger.error({ error, userId, superAdminId: user.id }, 'Failed to toggle admin status');
    return NextResponse.json({ error: 'Failed to toggle admin status' }, { status: 500 });
  }
});
