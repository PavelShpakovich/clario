import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { SubscriptionService } from '@/lib/subscriptions/service';

/**
 * GET /api/subscription
 * Get user's subscription and usage info
 */
export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  const status = await SubscriptionService.getSubscriptionStatus(user.id);

  return NextResponse.json({
    planId: status.plan.planId,
    cardsPerMonth: status.plan.cardsPerMonth,
    cardsRemaining: status.usage.cardsRemaining,
    status: status.plan.status,
    currentPeriodEnd: status.plan.currentPeriodEnd,
  });
});
