import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { SubscriptionService } from '@/lib/subscriptions/service';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const changePlanSchema = z.object({
  planId: z.enum(['free', 'basic', 'pro', 'unlimited']),
});

/**
 * PUT /api/admin/users/[userId]/plan
 * Admin endpoint to change a user's subscription plan
 */
export const PUT = withApiHandler(async (req: Request, ctx?: unknown) => {
  const { user } = await requireAuth();

  // Verify admin access
  if (!('isAdmin' in user) || !(user as Record<string, unknown>).isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { params } = (ctx as Record<string, unknown> | undefined) || {};
  const { userId } = (params as Record<string, unknown> | undefined) || {};

  if (!userId || typeof userId !== 'string') {
    throw new ValidationError({ message: 'userId is required' });
  }

  // Validate request body
  const body = changePlanSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { planId } = body.data;

  try {
    // Change the plan
    await SubscriptionService.changePlan(userId, planId as 'free' | 'basic' | 'pro' | 'unlimited');

    logger.info({ adminId: user.id, userId, newPlan: planId }, 'Admin changed user plan');

    return NextResponse.json({
      success: true,
      message: `Plan changed to ${planId}`,
      userId,
      planId,
    });
  } catch (error) {
    logger.error({ error, userId, adminId: user.id }, 'Failed to change user plan');
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 });
  }
});
