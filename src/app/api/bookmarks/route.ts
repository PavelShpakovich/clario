import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { listBookmarksForUser } from '@/lib/bookmarks';

const bodySchema = z.object({
  cardId: z.string().uuid(),
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();
  const { searchParams } = new URL(req.url);

  if (searchParams.get('idsOnly') === '1') {
    const { data, error } = await supabase
      .from('bookmarked_cards')
      .select('card_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to load bookmarks');
    }

    return NextResponse.json({ cardIds: (data ?? []).map((row) => row.card_id) });
  }

  const bookmarks = await listBookmarksForUser(user.id);
  return NextResponse.json({ bookmarks });
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { cardId } = body.data;

  const { data: card } = await supabase.from('cards').select('id').eq('id', cardId).maybeSingle();
  if (!card) {
    throw new NotFoundError({ message: 'Card not found' });
  }

  const { error } = await supabase.from('bookmarked_cards').insert({
    user_id: user.id,
    card_id: cardId,
  });

  if (error && error.code !== '23505') {
    throw new Error('Failed to bookmark card');
  }

  return NextResponse.json({ ok: true }, { status: error?.code === '23505' ? 200 : 201 });
});
