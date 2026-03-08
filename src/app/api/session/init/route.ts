import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';

const bodySchema = z.object({
  themeId: z.string().uuid(),
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { themeId } = body.data;

  // Return existing session if one already exists for this user+theme today
  const today = new Date().toISOString().split('T')[0];
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('theme_id', themeId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .maybeSingle();

  if (existingSession) {
    const { data: seenCards } = await supabase
      .from('session_cards')
      .select('card_id')
      .eq('session_id', existingSession.id)
      .order('seen_at', { ascending: true });

    return NextResponse.json({
      sessionId: existingSession.id,
      seenCardIds: seenCards?.map((sc) => sc.card_id) ?? [],
    });
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, theme_id: themeId })
    .select('id')
    .single();

  if (error ?? !session) {
    throw new Error('Failed to create session');
  }

  return NextResponse.json(
    { sessionId: session.id, seenCardIds: [] },
    { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  );
});
