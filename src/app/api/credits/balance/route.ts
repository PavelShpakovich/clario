import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { getBalance } from '@/lib/credits/service';

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();
  const { balance, forecastAccessUntil } = await getBalance(user.id);

  return NextResponse.json({
    balance,
    forecastAccessUntil: forecastAccessUntil?.toISOString() ?? null,
  });
});
