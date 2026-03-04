/**
 * Study API client — pure fetch wrapper (no React)
 * Centralizes all study session and card loading API calls
 */

import type { Database } from '@/lib/supabase/types';

type Card = Database['public']['Tables']['cards']['Row'];

export interface CardsResponse {
  cards: Card[];
  remaining: number;
  generating: boolean;
  generationFailed?: boolean;
}

interface FetchCardsOptions {
  triggerGeneration?: boolean;
}

class StudyApi {
  /**
   * Initialize a study session for a theme
   */
  async initSession(themeId: string): Promise<{ sessionId: string; seenCardIds: string[] }> {
    const res = await fetch('/api/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });

    if (!res.ok) {
      throw new Error('Failed to initialize session');
    }

    return res.json();
  }

  /**
   * Fetch cards for a session
   */
  async fetchCards(
    sessionId: string,
    themeId: string,
    options?: FetchCardsOptions,
  ): Promise<CardsResponse> {
    const params = new URLSearchParams({
      sessionId,
      themeId,
      triggerGeneration: options?.triggerGeneration ? '1' : '0',
    });

    const res = await fetch(`/api/cards?${params.toString()}`);

    if (!res.ok) {
      throw new Error('Failed to fetch cards');
    }

    return res.json();
  }

  /**
   * Mark a card as seen in the session
   */
  async markCardSeen(sessionId: string, cardId: string): Promise<void> {
    const res = await fetch('/api/session/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, cardId }),
    });

    if (!res.ok) {
      throw new Error('Failed to mark card as seen');
    }
  }
}

export const studyApi = new StudyApi();
