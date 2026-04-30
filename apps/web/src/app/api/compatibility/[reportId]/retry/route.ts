import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { resetCompatibilityForRetry } from '@/lib/compatibility/service';

const uuidSchema = z.string().uuid();

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ reportId: string }> } | undefined;
  const reportId = routeContext?.params ? (await routeContext.params).reportId : undefined;

  if (!reportId) throw new NotFoundError({ message: 'Report not found' });
  if (!uuidSchema.safeParse(reportId).success)
    throw new ValidationError({ message: 'Invalid report ID' });

  await resetCompatibilityForRetry(reportId, user.id);

  return NextResponse.json({ ok: true });
});
