import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { SubscriptionService } from '@/lib/subscriptions/service';

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();
  const status = await SubscriptionService.getSubscriptionStatus(user.id);
  return NextResponse.json(status);
});
