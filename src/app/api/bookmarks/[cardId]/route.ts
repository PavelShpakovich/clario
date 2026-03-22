import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';

export const DELETE = withApiHandler(async (_req: Request, ctx?: unknown) => {
  const { user, supabase } = await requireAuth();
  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { cardId } = (await params) || {};

  if (!cardId || typeof cardId !== 'string') {
    throw new ValidationError({ message: 'cardId is required' });
  }

  const { error } = await supabase
    .from('bookmarked_cards')
    .delete()
    .eq('user_id', user.id)
    .eq('card_id', cardId);

  if (error) {
    throw new Error('Failed to remove bookmark');
  }

  return NextResponse.json({ ok: true });
});
