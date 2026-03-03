import { generateCards as llmGenerateCards } from '@/lib/llm';
import { chunkSourceText, distributeCount } from '@/lib/llm/chunking';
import { LlmError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { MAX_CARDS_PER_BATCH } from '@/lib/constants';
import type { CardsOutput } from '@/lib/llm/schema';

/** Retry LLM generation up to maxAttempts times on schema/parse failures */
export async function generateWithRetry(
  input: Parameters<typeof llmGenerateCards>[0],
  maxAttempts = 3,
): Promise<CardsOutput> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await llmGenerateCards(input);
    } catch (err) {
      lastErr = err;
      const isLlmErr =
        err instanceof LlmError ||
        (err instanceof Error && err.message.includes('schema validation'));
      if (!isLlmErr) throw err; // non-recoverable, rethrow immediately
      logger.warn(
        { attempt, maxAttempts, errMsg: err instanceof Error ? err.message : String(err) },
        'LLM generation failed, retrying',
      );
    }
  }
  throw lastErr;
}

/**
 * Generate cards with optional source text chunking for long documents.
 * If source is > 8000 chars, splits into chunks and distributes card generation.
 * Merges and deduplicates results by title.
 */
export async function generateWithSourceChunking(
  input: Parameters<typeof llmGenerateCards>[0],
  existingTitles: string[] = [],
  onProgress?: (cards: CardsOutput) => Promise<void>,
): Promise<CardsOutput> {
  const sourceText = input.sourceText;
  const CHUNK_THRESHOLD = 8000;
  // Use small internal batches for short text to show progress quickly
  const MINI_BATCH_SIZE = 4;

  const allCards: CardsOutput = [];
  const seenTitles = new Set(existingTitles.map((t) => t.toLowerCase()));

  // If source is short or missing, break into mini-batches
  if (!sourceText || sourceText.length <= CHUNK_THRESHOLD) {
    // If request is small, do it in one go
    if (input.count <= MINI_BATCH_SIZE) {
      const cards = await generateWithRetry(input, 3);
      if (onProgress) await onProgress(cards);
      return cards;
    }

    // Split into mini-batches
    const batchCount = Math.ceil(input.count / MINI_BATCH_SIZE);
    const counts = distributeCount(input.count, batchCount);

    logger.info(
      { total: input.count, batchCount },
      'Splitting short-text generation into mini-batches',
    );

    for (const batchSize of counts) {
      if (batchSize === 0) continue;

      try {
        const batchCards = await generateWithRetry(
          {
            ...input,
            count: batchSize,
            topicsToAvoid: [...(input.topicsToAvoid || []), ...Array.from(seenTitles)],
          },
          3,
        );

        const newCards: CardsOutput = [];
        for (const card of batchCards) {
          const normalizedTitle = card.title.toLowerCase();
          if (!seenTitles.has(normalizedTitle)) {
            newCards.push(card);
            allCards.push(card);
            seenTitles.add(normalizedTitle);
          }
        }

        if (newCards.length > 0 && onProgress) {
          await onProgress(newCards);
        }
      } catch (err) {
        logger.warn(
          { error: err instanceof Error ? err.message : String(err) },
          'Mini-batch generation failed, continuing',
        );
      }
    }

    if (allCards.length === 0) {
      throw new Error('No cards generated from any batch');
    }

    return allCards;
  }

  // Source is long → chunk it and distribute generation
  logger.info(
    { sourceLength: sourceText.length, count: input.count },
    'Source text is long, chunking for distributed generation',
  );

  const chunks = chunkSourceText(sourceText, 6000, 500);
  logger.info({ chunkCount: chunks.length, totalChars: sourceText.length }, 'Created text chunks');

  // Distribute card count across chunks (ensure each chunk gets at least 1)
  const countsPerChunk = distributeCount(input.count, chunks.length);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const cardsForThisChunk = countsPerChunk[i];

    if (cardsForThisChunk === 0) continue; // Skip if no cards allocated to this chunk

    logger.info(
      { chunkIndex: i, chunkSize: chunk.text.length, cardsToGenerate: cardsForThisChunk },
      'Generating cards from chunk',
    );

    try {
      const chunkCards = await generateWithRetry(
        {
          theme: input.theme,
          sourceText: chunk.text,
          count: cardsForThisChunk,
          topicsToAvoid: input.topicsToAvoid,
          language: input.language,
        },
        3,
      );

      // Deduplicate by title before adding
      const newCards: CardsOutput = [];
      for (const card of chunkCards) {
        const normalizedTitle = card.title.toLowerCase();
        if (!seenTitles.has(normalizedTitle)) {
          newCards.push(card);
          allCards.push(card);
          seenTitles.add(normalizedTitle);
        } else {
          logger.debug({ title: card.title }, 'Skipping duplicate card title from chunk');
        }
      }

      if (newCards.length > 0 && onProgress) {
        await onProgress(newCards);
      }
    } catch (err) {
      logger.warn(
        { chunkIndex: i, error: err instanceof Error ? err.message : String(err) },
        'Failed to generate from chunk, continuing with other chunks',
      );
      // Continue with next chunk on failure
    }
  }

  if (allCards.length === 0) {
    throw new Error('No cards generated from any chunk');
  }

  logger.info(
    { totalGenerated: allCards.length, requestedCount: input.count },
    'Completed chunked generation',
  );

  return allCards;
}

// In-memory set of themeIds currently being generated
export const generatingThemes = new Set<string>();

// Cooldown after a generation failure
export const failedThemes = new Map<string, number>();
export const GENERATION_FAILURE_COOLDOWN_MS = 60_000; // 1 minute

export class GenerationService {
  /**
   * Trigger card generation for a theme (background task)
   */
  static async triggerGeneration(userId: string, themeId: string): Promise<void> {
    generatingThemes.add(themeId);
    logger.info({ themeId }, 'Starting card generation');
    try {
      const { data: theme } = await supabaseAdmin
        .from('themes')
        .select('name, description')
        .eq('id', themeId)
        .single();

      if (!theme) {
        logger.warn({ themeId }, 'Theme not found during generation');
        return;
      }

      // Fetch source text if any source is ready
      const { data: sources } = await supabaseAdmin
        .from('data_sources')
        .select('id, extracted_text')
        .eq('theme_id', themeId)
        .eq('status', 'ready')
        .limit(1);

      const sourceText = sources?.[0]?.extracted_text ?? undefined;
      const sourceId = sources?.[0]?.id ?? null;

      // Fetch existing card titles to avoid duplication
      const { data: existingCards } = await supabaseAdmin
        .from('cards')
        .select('title')
        .eq('theme_id', themeId);

      const topicsToAvoid = existingCards?.map((c) => c.title) ?? [];

      logger.info(
        { themeId, themeName: theme.name, existingTopics: topicsToAvoid.length },
        'Generating cards for theme',
      );

      const cards = await generateWithSourceChunking(
        {
          theme: theme.name,
          sourceText,
          count: MAX_CARDS_PER_BATCH,
          topicsToAvoid: topicsToAvoid.length > 0 ? topicsToAvoid : undefined,
        },
        topicsToAvoid,
        async (newCards) => {
          if (newCards.length === 0) return;

          await supabaseAdmin.from('cards').insert(
            newCards.map((c) => ({
              user_id: userId,
              theme_id: themeId,
              source_id: sourceId,
              title: c.title,
              body: c.body,
              topic: theme.name,
            })),
          );

          logger.info(
            { themeId, batchCount: newCards.length },
            'Inserted streaming batch of cards',
          );
        },
      );

      logger.info({ themeId, totalCount: cards.length }, 'All batches complete');

      // Removed bulk insert since cards are inserted incrementally via callback

      logger.info({ themeId }, 'Card generation complete');

      // Clear failure cooldown on success
      failedThemes.delete(themeId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ themeId, errMsg }, 'Card generation failed');

      // Start cooldown to avoid rapid retries
      failedThemes.set(themeId, Date.now());

      throw err;
    } finally {
      generatingThemes.delete(themeId);
    }
  }

  /**
   * Check if generation should be triggered and do it in background
   */
  static maybeStartGeneration(
    userId: string,
    themeId: string,
    unseenCount: number,
    threshold: number,
  ): boolean {
    const isGenerating = generatingThemes.has(themeId);
    const lastFailureAt = failedThemes.get(themeId);
    const inCooldown =
      lastFailureAt !== undefined && Date.now() - lastFailureAt < GENERATION_FAILURE_COOLDOWN_MS;

    // Only trigger if: below threshold, not already running, not in failure cooldown
    if (unseenCount < threshold && !isGenerating && !inCooldown) {
      logger.info({ themeId }, 'Triggering card generation in background');
      this.triggerGeneration(userId, themeId).catch(() => {
        // Silently fail background generation
      });
      return true;
    }

    return isGenerating;
  }

  /**
   * Check if currently generating
   */
  static isGenerating(themeId: string): boolean {
    return generatingThemes.has(themeId);
  }

  /**
   * Check if generation failed recently
   */
  static isGenerationFailed(themeId: string): boolean {
    const lastFailureAt = failedThemes.get(themeId);
    return (
      lastFailureAt !== undefined && Date.now() - lastFailureAt < GENERATION_FAILURE_COOLDOWN_MS
    );
  }

  /**
   * Clear state (testing only)
   */
  static clearState(): void {
    generatingThemes.clear();
    failedThemes.clear();
  }
}
