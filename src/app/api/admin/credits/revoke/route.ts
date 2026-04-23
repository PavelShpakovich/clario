import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { deductCredits } from '@/lib/credits/service';
import { InsufficientCreditsError } from '@/lib/errors';

const revokeSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1).max(1000),
  note: z.string().max(500).optional(),
});

export const POST = withApiHandler(async (req: Request) => {
  await requireAdmin();

  const parsed = revokeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 422 },
    );
  }

  const { userId, amount, note } = parsed.data;

  try {
    const result = await deductCredits(userId, amount, 'admin_revoke', {
      note: note ?? undefined,
    });
    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          balance: (err.context.balance as number) ?? 0,
        },
        { status: 422 },
      );
    }
    throw err;
  }
});
