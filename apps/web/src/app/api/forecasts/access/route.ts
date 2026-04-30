import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { activateForecastAccess } from '@/lib/credits/service';
import { getCreditCosts } from '@/lib/credits/pricing';
import { InsufficientCreditsError } from '@/lib/errors';

export const POST = withApiHandler(async () => {
  const { user } = await requireAuth();

  const costs = await getCreditCosts();
  const creditCost = costs.forecast_report;

  try {
    const result = await activateForecastAccess(user.id, creditCost);
    return NextResponse.json({
      forecastAccessUntil: result.forecastAccessUntil?.toISOString() ?? null,
      newBalance: result.newBalance,
      free: result.free,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          required: creditCost,
          balance: (err.context.balance as number) ?? 0,
        },
        { status: 402 },
      );
    }
    throw err;
  }
});
