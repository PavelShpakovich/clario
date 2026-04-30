import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { generateReadingContent } from '@/lib/readings/service';

// Allow up to 90 seconds for the 3-stage LLM pipeline
export const maxDuration = 90;

const uuidSchema = z.string().uuid();

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  await generateReadingContent(readingId, user.id);

  return NextResponse.json({ ok: true });
});
