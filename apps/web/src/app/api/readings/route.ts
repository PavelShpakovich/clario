import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError, RateLimitError, InsufficientCreditsError } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { readingCreateSchema } from '@/lib/readings/reading-request-schema';
import { createPendingReading } from '@/lib/readings/service';
import { chargeForProduct } from '@/lib/credits/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  const { data, error } = await db
    .from('readings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return NextResponse.json({ readings: data ?? [] });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const rl = checkRateLimit(`reading-create:${user.id}`, 5, 60 * 60 * 1000); // 5 per hour
  if (!rl.allowed) {
    throw new RateLimitError({
      message: 'Too many reading requests. Please wait before generating another.',
      context: { retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
    });
  }

  const json = await req.json();
  const parsed = readingCreateSchema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const reading = await createPendingReading(user.id, parsed.data);

  // Charge credits (skip for retry of failed reading)
  const isRetry = !!parsed.data.replaceReadingId;
  if (!isRetry) {
    try {
      await chargeForProduct(user.id, 'natal_report', { referenceId: reading.id });
    } catch (err) {
      await db.from('readings').delete().eq('id', reading.id).eq('user_id', user.id);
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
  }

  // Delete the old failed reading now that the replacement pending record exists
  if (parsed.data.replaceReadingId) {
    await db
      .from('readings')
      .delete()
      .eq('id', parsed.data.replaceReadingId)
      .eq('user_id', user.id)
      .eq('status', 'error');
  }

  return NextResponse.json({ reading }, { status: 201 });
});
