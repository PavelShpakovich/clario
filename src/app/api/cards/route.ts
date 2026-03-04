import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { CARD_GENERATION_THRESHOLD, MAX_CARDS_PER_SESSION_FETCH } from '@/lib/constants';
import { GenerationService } from '@/services/generation.service';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  sessionId: z.string().uuid(),
  themeId: z.string().uuid(),
  triggerGeneration: z.enum(['0', '1']).optional(),
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { searchParams } = new URL(req.url);
  const query = querySchema.safeParse({
    sessionId: searchParams.get('sessionId'),
    themeId: searchParams.get('themeId'),
    triggerGeneration: searchParams.get('triggerGeneration') ?? undefined,
  });

  if (!query.success) {
    throw new ValidationError({
      message: query.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { sessionId, themeId, triggerGeneration } = query.data;

  // Verify session belongs to this user
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .limit(1);

  if (!sessions?.[0]) {
    throw new NotFoundError({ message: 'Session not found' });
  }

  const { data: seenRows, error: seenRowsError } = await supabase
    .from('session_cards')
    .select('card_id')
    .eq('session_id', sessionId);

  if (seenRowsError) {
    logger.error({ seenRowsError, sessionId }, 'Failed to load session progress');
    throw new Error('Failed to load session progress');
  }

  const seenCardIds = (seenRows ?? []).map((row) => row.card_id);
  // Improved filter logic to handle empty uuid array string requirements correctly
  let seenFilter: string | null = null;
  if (seenCardIds.length > 0) {
    seenFilter = `(${seenCardIds.join(',')})`;
  }

  logger.info({ sessionId, themeId, seenCount: seenCardIds.length }, 'Fetching cards for theme');

  // Fetch unseen cards for this specific theme
  let cardsQuery = supabase
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('created_at', { ascending: true })
    .limit(MAX_CARDS_PER_SESSION_FETCH);

  if (seenFilter) {
    cardsQuery = cardsQuery.not('id', 'in', seenFilter);
  }

  const { data: cards, error: cardsError } = await cardsQuery;

  if (cardsError) {
    logger.error({ cardsError, themeId, sessionId, seenFilter }, 'Failed to fetch cards');
    throw new Error('Failed to fetch cards');
  }

  // Improved calculation of remaining count - exclude the seen cards
  let remainingQuery = supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('theme_id', themeId);

  if (seenFilter) {
    remainingQuery = remainingQuery.not('id', 'in', seenFilter);
  }

  const { count: remainingCount, error: remainingError } = await remainingQuery;

  if (remainingError) {
    logger.error({ remainingError, themeId, seenFilter }, 'Failed to count remaining cards');
    throw new Error('Failed to count remaining cards');
  }

  const remaining = remainingCount ?? 0;

  // Trigger generation only when client explicitly requests it
  const shouldTriggerGeneration = triggerGeneration === '1';
  const isGenerating = shouldTriggerGeneration
    ? GenerationService.maybeStartGeneration(user.id, themeId, remaining, CARD_GENERATION_THRESHOLD)
    : GenerationService.isGenerating(themeId);

  const generationFailed = GenerationService.isGenerationFailed(themeId);

  logger.info(
    {
      themeId,
      remaining,
      isGenerating,
      generationFailed,
      cardCount: cards?.length,
      shouldTriggerGeneration,
    },
    'Cards fetched',
  );

  return NextResponse.json({
    cards: cards ?? [],
    remaining,
    generating: isGenerating,
    generationFailed,
  });
});
