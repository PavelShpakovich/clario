import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError, InsufficientCreditsError } from '@/lib/errors';
import { chargeForProduct } from '@/lib/credits/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();
const UNLOCK_MESSAGE_COUNT = 5;

async function getReadingId(ctx: unknown): Promise<string | undefined> {
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  return routeContext?.params ? (await routeContext.params).readingId : undefined;
}

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const readingId = await getReadingId(ctx);

  if (!readingId || !uuidSchema.safeParse(readingId).success) {
    throw new ValidationError({ message: 'Invalid reading ID' });
  }

  // Verify reading belongs to user
  const { data: reading } = await db
    .from('readings')
    .select('id, chart_id, title')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) {
    throw new NotFoundError({ message: 'Reading not found' });
  }

  // Get or create thread (upsert with unique constraint on reading_id + user_id)
  const { data: thread } = await db
    .from('follow_up_threads')
    .upsert(
      {
        user_id: user.id,
        reading_id: readingId,
        chart_id: reading.chart_id,
        title: reading.title,
      },
      { onConflict: 'reading_id,user_id' },
    )
    .select('id, message_limit')
    .single();

  if (!thread) {
    throw new NotFoundError({ message: 'Failed to create chat thread' });
  }

  // Charge credits (respects free-product flag)
  let newBalance: number;
  try {
    const charge = await chargeForProduct(user.id, 'follow_up_pack', {
      referenceId: thread.id,
    });
    newBalance = charge.newBalance;
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

  // Increase message limit on the thread
  const currentLimit = thread.message_limit ?? 5;
  const newLimit = currentLimit + UNLOCK_MESSAGE_COUNT;

  await db.from('follow_up_threads').update({ message_limit: newLimit }).eq('id', thread.id);

  return NextResponse.json({
    messagesLimit: newLimit,
    addedMessages: UNLOCK_MESSAGE_COUNT,
    newBalance,
  });
});
