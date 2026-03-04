'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Database } from '@/lib/supabase/types';
import { studyApi } from '@/services/study-api';

type Card = Database['public']['Tables']['cards']['Row'];

/**
 * Hook to manage study session state and card fetching
 * Handles:
 * - Initial card loading
 * - Infinite polling while generating
 * - Infinite mode toggle
 * - Marking cards seen
 *
 * @example
 * const { cards, isGenerating, infiniteMode, fetchCards, markSeen } = useStudySession(themeId);
 * return (
 *   <>
 *     {cards.map(card => <Card key={card.id} onVisible={() => markSeen(card.id)} />)}
 *     <InfiniteToggle active={infiniteMode} onChange={(v) => setInfiniteMode(v)} />
 *   </>
 * );
 */
export function useStudySession(themeId: string) {
  const { data: session } = useSession();

  const [cards, setCards] = useState<Card[]>([]);
  const [studySession, setStudySession] = useState<{ id: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isManualGenerating, setIsManualGenerating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [infiniteMode, setInfiniteMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(10);

  const pollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPollingRef = useRef<boolean>(false);

  interface FetchCardsOptions {
    triggerGeneration?: boolean;
  }

  const fetchCardsForSession = useCallback(
    async (sessionId: string, options?: FetchCardsOptions) => {
      try {
        console.log(`[useStudySession] Fetching cards for session ${sessionId}...`, options);
        const data = await studyApi.fetchCards(sessionId, themeId, options);
        console.log(`[useStudySession] Received data:`, {
          cardCount: data.cards.length,
          generating: data.generating,
          failed: data.generationFailed,
        });

        setCards((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const toAdd = data.cards.filter((c) => !existing.has(c.id));
          return [...prev, ...toAdd];
        });

        setIsGenerating(data.generating);

        if (data.generationFailed) {
          setError('Generation failed. Please wait a minute before retrying.');
        } else {
          setError(null);
        }

        setIsInitialLoading(false);
        return data;
      } catch (err) {
        setIsInitialLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to load cards');
        return null;
      }
    },
    [themeId],
  );

  // Initialize session and first fetch
  useEffect(() => {
    const initSession = async () => {
      try {
        setCards([]);
        setError(null);
        setIsGenerating(false);
        setIsInitialLoading(true);

        const data = await studyApi.initSession(themeId);
        console.log(`[useStudySession] Session initialized:`, data.sessionId);
        const createdSession = { id: data.sessionId };
        setStudySession(createdSession);

        const initialData = await fetchCardsForSession(data.sessionId, {
          triggerGeneration: false,
        });

        if (
          infiniteMode &&
          initialData &&
          initialData.cards.length === 0 &&
          !initialData.generating
        ) {
          console.log(`[useStudySession] Initial card list empty, triggering generation...`);
          await fetchCardsForSession(data.sessionId, { triggerGeneration: true });
        }
      } catch (err) {
        console.error(`[useStudySession] Initialization error:`, err);
        setIsInitialLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      }
    };

    if (session?.user?.id) {
      void initSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, session?.user?.id, fetchCardsForSession]);

  // Manual/public fetch
  const fetchCards = useCallback(
    async (options?: FetchCardsOptions) => {
      if (!studySession) return;

      await fetchCardsForSession(studySession.id, options);
    },
    [studySession, fetchCardsForSession],
  );

  // Poll every 2s ONLY while server is actively generating — picks up new cards as they arrive
  useEffect(() => {
    if (!isGenerating || !studySession) {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
      isPollingRef.current = false;
      return;
    }

    if (isPollingRef.current) return;
    isPollingRef.current = true;

    const poll = async () => {
      try {
        const data = await studyApi.fetchCards(studySession.id, themeId, {
          triggerGeneration: false,
        });
        setCards((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const toAdd = data.cards.filter((c) => !existing.has(c.id));
          return [...prev, ...toAdd];
        });
        setIsGenerating(data.generating);

        if (data.generationFailed) {
          setError('Generation failed. Please wait a minute before retrying.');
        } else {
          setError(null);
        }

        // Keep polling only while still generating
        if (data.generating) {
          console.log(`[useStudySession] Still generating, scheduling next poll in 2s...`);
          pollTimerRef.current = setTimeout(poll, 2000);
        } else {
          console.log(`[useStudySession] Generation finished or not active.`);
          isPollingRef.current = false;
        }
      } catch (err) {
        console.error(`[useStudySession] Poll error:`, err);
        setError(err instanceof Error ? err.message : 'Failed while polling cards');
        isPollingRef.current = false;
      }
    };

    console.log(`[useStudySession] Starting polling loop...`);
    pollTimerRef.current = setTimeout(poll, 2000);

    return () => {
      console.log(`[useStudySession] Cleaning up polling loop.`);
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
      isPollingRef.current = false;
    };
  }, [isGenerating, studySession, themeId]);

  const markCardSeen = useCallback(
    async (cardId: string) => {
      if (!studySession) return;

      try {
        await studyApi.markCardSeen(studySession.id, cardId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark card seen');
      }
    },
    [studySession],
  );

  const generateMore = useCallback(
    async (count = cardCount) => {
      if (isGenerating || isManualGenerating) return;
      // Use a separate flag so the background poller can't clobber this loading state.
      // /api/generate/cards is synchronous — GenerationService never sees it, so
      // isGenerating would immediately be reset to false by the next poll tick.
      setIsManualGenerating(true);
      setError(null);
      try {
        const res = await fetch('/api/generate/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId, count }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? 'Generation failed');
        }
        // Cards are already in DB when the response returns (synchronous route).
        // Refetch so the new cards appear immediately.
        if (studySession) {
          await fetchCardsForSession(studySession.id, { triggerGeneration: false });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setIsManualGenerating(false);
      }
    },
    [themeId, isGenerating, isManualGenerating, cardCount, studySession, fetchCardsForSession],
  );

  return {
    cards,
    session: studySession,
    isGenerating,
    isManualGenerating,
    isInitialLoading,
    infiniteMode,
    error,
    cardCount,
    fetchCards,
    markCardSeen,
    generateMore,
    setInfiniteMode,
    setCardCount,
  };
}
