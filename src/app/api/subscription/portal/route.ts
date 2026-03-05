import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { SubscriptionService } from '@/lib/subscriptions/service';
import { env } from '@/lib/env';

/**
 * POST /api/subscription/portal
 * Get subscription management info
 *
 * NOTE: In production with payment processor, this would return a customer portal URL.
 * For now, returns subscription details and support contact.
 */
export const POST = withApiHandler(async () => {
  const { user } = await requireAuth();

  const status = await SubscriptionService.getSubscriptionStatus(user.id);

  return NextResponse.json({
    plan: status.plan.planId,
    status: status.plan.status,
    currentPeriodEnd: status.plan.currentPeriodEnd,
    message: `Payment management not yet available. Contact ${env.SUPPORT_EMAIL} for plan changes.`,
    supportEmail: env.SUPPORT_EMAIL,
  });
});
