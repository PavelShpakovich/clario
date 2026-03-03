/**
 * Cards API client — pure fetch wrapper (no React)
 * Centralizes all card API calls
 */

interface Card {
  id: string;
  user_id: string | null;
  theme_id: string;
  source_id: string | null;
  title: string;
  body: string;
  topic?: string | null;
  is_public?: boolean;
  created_at: string;
}

class CardsApi {
  /**
   * Update card privacy and content
   */
  async updateCard(
    cardId: string,
    updates: Partial<Pick<Card, 'is_public' | 'title' | 'body'>>,
  ): Promise<Card> {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update card');
    }

    const result = (await res.json()) as { card: Card };
    return result.card;
  }

  /**
   * Toggle card privacy status
   */
  async togglePrivacy(cardId: string, isPublic: boolean): Promise<Card> {
    return this.updateCard(cardId, { is_public: isPublic });
  }
}

export const cardsApi = new CardsApi();
