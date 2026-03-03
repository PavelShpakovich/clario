import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';

const updateCardSchema = z.object({
  is_public: z.boolean().optional(),
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export const PATCH = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { pathname } = new URL(req.url);
  const cardId = pathname.split('/').pop();

  if (!cardId) {
    throw new ValidationError({ message: 'Invalid card ID' });
  }

  // Verify ownership before allowing updates
  const { data: existingCard } = await supabase
    .from('cards')
    .select('user_id')
    .eq('id', cardId)
    .maybeSingle();

  if (!existingCard) {
    throw new NotFoundError({ message: 'Card not found' });
  }

  if (existingCard.user_id !== user.id) {
    throw new NotFoundError({ message: 'You do not have permission to edit this card' });
  }

  const body = updateCardSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.is_public !== undefined) updateData.is_public = body.data.is_public;
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.body !== undefined) updateData.body = body.data.body;

  const { data: updatedCard, error } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', cardId)
    .select()
    .single();

  if (error ?? !updatedCard) {
    throw error ?? new Error('Failed to update card');
  }

  return NextResponse.json({ card: updatedCard });
});
