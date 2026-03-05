import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const toggleAdminSchema = z.object({
  isAdmin: z.boolean(),
});

/**
 * PUT /api/admin/users/[userId]/admin
 * Admin endpoint to toggle admin status for a user
 * Only users in ADMIN_EMAILS can promote/demote others
 */
export const PUT = withApiHandler(async (req: Request, ctx?: unknown) => {
  const { user } = await requireAuth();

  // Verify admin access - only super admins (from ADMIN_EMAILS env) can toggle admin status
  if (!env.ADMIN_EMAILS) {
    return NextResponse.json({ error: 'Admin management not configured' }, { status: 403 });
  }

  const userEmail = ('email' in user && user.email) || '';
  const adminEmails = env.ADMIN_EMAILS.split(',').map((e) => e.trim());
  const isSuperAdmin = adminEmails.includes(userEmail);

  if (!isSuperAdmin) {
    return NextResponse.json(
      { error: 'Only super admins can toggle admin status' },
      { status: 403 },
    );
  }

  const { params } = (ctx as Record<string, unknown> | undefined) || {};
  const { userId } = (params as Record<string, unknown> | undefined) || {};

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

  const { isAdmin } = body.data;

  try {
    // Update profile
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    logger.info({ superAdminId: user.id, userId, newAdminStatus: isAdmin }, 'Admin status toggled');

    return NextResponse.json({
      success: true,
      message: `User ${isAdmin ? 'promoted to' : 'demoted from'} admin`,
      userId,
      isAdmin,
    });
  } catch (error) {
    logger.error({ error, userId, superAdminId: user.id }, 'Failed to toggle admin status');
    return NextResponse.json({ error: 'Failed to toggle admin status' }, { status: 500 });
  }
});
