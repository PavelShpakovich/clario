import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError, InsufficientCreditsError } from '@/lib/errors';
import { clearDailyForecastContent } from '@/lib/forecasts/service';
import { hasForecastAccess, chargeForProduct } from '@/lib/credits/service';

const uuidSchema = z.string().uuid();

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();

  const routeContext = ctx as { params?: Promise<{ forecastId: string }> } | undefined;
  const forecastId = routeContext?.params ? (await routeContext.params).forecastId : undefined;

  if (!forecastId) throw new NotFoundError({ message: 'Forecast not found' });
  if (!uuidSchema.safeParse(forecastId).success)
    throw new ValidationError({ message: 'Invalid forecast ID' });

  const hasAccess = await hasForecastAccess(user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'forecast_access_required' }, { status: 403 });
  }

  let charge;
  try {
    charge = await chargeForProduct(user.id, 'forecast_report');
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          required: (err.context.required as number) ?? 0,
          balance: (err.context.balance as number) ?? 0,
        },
        { status: 402 },
      );
    }
    throw err;
  }

  await clearDailyForecastContent(forecastId, user.id);

  return NextResponse.json({ ok: true, newBalance: charge.newBalance, free: charge.free });
});
