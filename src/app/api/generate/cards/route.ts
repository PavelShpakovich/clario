import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, RateLimitError, ValidationError } from '@/lib/errors';
import { generateWithSourceChunking } from '@/services/generation.service';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { RATE_LIMIT_GENERATE_RPM, MAX_CARDS_PER_BATCH } from '@/lib/constants';

const bodySchema = z.object({
  themeId: z.string().uuid(),
  sourceId: z.string().uuid().optional(),
  count: z.number().int().min(1).max(MAX_CARDS_PER_BATCH).default(MAX_CARDS_PER_BATCH),
});

/** Simple in-memory rate limiter (per process). For multi-instance, swap for Redis/Vercel KV. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 60_000;
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= RATE_LIMIT_GENERATE_RPM) {
    throw new RateLimitError({
      message: `Rate limit exceeded: max ${RATE_LIMIT_GENERATE_RPM} generation requests per minute`,
    });
  }

  entry.count += 1;
}

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  checkRateLimit(user.id);

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { themeId, sourceId, count } = body.data;

  // Verify theme belongs to this user
  const { data: theme } = await supabase
    .from('themes')
    .select('name, description, language')
    .eq('id', themeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!theme) throw new NotFoundError({ message: 'Theme not found' });

  // Optionally enrich with source text
  let sourceText: string | undefined;
  if (sourceId) {
    const { data: source } = await supabase
      .from('data_sources')
      .select('extracted_text, status')
      .eq('id', sourceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!source) throw new NotFoundError({ message: 'Source not found' });
    if (source.status !== 'ready') {
      throw new ValidationError({
        message: 'Source is not ready yet — please wait for processing',
      });
    }
    sourceText = source.extracted_text ?? undefined;
  }

  // Fetch existing card titles for this theme to avoid duplication
  const { data: existingCards } = await supabaseAdmin
    .from('cards')
    .select('title')
    .eq('theme_id', themeId);

  const topicsToAvoid = existingCards?.map((c) => c.title) ?? [];

  const cards = await generateWithSourceChunking(
    {
      theme: theme.name,
      sourceText,
      count,
      topicsToAvoid: topicsToAvoid.length > 0 ? topicsToAvoid : undefined,
      language: theme.language as 'en' | 'ru' | undefined,
    },
    topicsToAvoid,
  );

  logger.info(
    { themeId, cardCount: cards.length, existingTopics: topicsToAvoid.length },
    'Generated cards',
  );

  // Deduplicate by normalized title before insert (in case LLM returned similar titles)
  const seenTitles = new Set(topicsToAvoid.map((t) => t.toLowerCase()));
  const uniqueCards = cards.filter((card) => {
    const normalized = card.title.toLowerCase();
    if (seenTitles.has(normalized)) {
      logger.warn({ title: card.title }, 'Skipping duplicate card title');
      return false;
    }
    seenTitles.add(normalized);
    return true;
  });

  if (uniqueCards.length === 0) {
    return NextResponse.json(
      { error: 'No unique cards generated (all duplicates of existing topics)' },
      { status: 400 },
    );
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('cards')
    .insert(
      uniqueCards.map((c) => ({
        user_id: user.id,
        theme_id: themeId,
        source_id: sourceId ?? null,
        title: c.title,
        body: c.body,
        topic: theme.name,
      })),
    )
    .select();

  if (error) throw error;

  return NextResponse.json({ cards: inserted, count: inserted?.length ?? 0 }, { status: 201 });
});
