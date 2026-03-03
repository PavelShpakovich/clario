import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { Database } from '@/lib/supabase/types';

type Card = Database['public']['Tables']['cards']['Row'];
type SessionCard = Database['public']['Tables']['session_cards']['Row'];

export class CardService {
  /**
   * Get unseen cards for a theme
   * Returns cards in the order they were created (sequential)
   */
  static async getUnseenCards(themeId: string, userId: string, limit: number = 5): Promise<Card[]> {
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*, session_cards!left(card_id)')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('theme_id', themeId)
      .is('session_cards.card_id', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error({ themeId, userId, limit, error }, 'Failed to fetch cards');
      throw new Error('Failed to fetch cards');
    }

    return (cards || []).map(
      (card) =>
        ({
          ...card,
          session_cards: undefined,
        }) as Card,
    );
  }

  /**
   * Get a single card
   */
  static async getCard(cardId: string): Promise<Card> {
    const { data, error } = await supabaseAdmin.from('cards').select('*').eq('id', cardId).single();

    if (error || !data) {
      logger.error({ cardId, error }, 'Card not found');
      throw new Error('Card not found');
    }

    return data;
  }

  /**
   * Mark a card as seen
   */
  static async markCardSeen(
    cardId: string,
    userId: string,
    sessionId: string,
  ): Promise<SessionCard> {
    const { data, error } = await supabaseAdmin
      .from('session_cards')
      .insert({
        card_id: cardId,
        session_id: sessionId,
        user_id: userId,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error({ cardId, userId, sessionId, error }, 'Failed to mark card seen');
      throw new Error('Failed to mark card seen');
    }

    return data;
  }

  /**
   * Get all cards for a theme (including seen cards)
   */
  static async getAllThemeCards(themeId: string, userId: string): Promise<Card[]> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('theme_id', themeId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ themeId, userId, error }, 'Failed to fetch all cards');
      throw new Error('Failed to fetch all cards');
    }

    return data || [];
  }

  /**
   * Search cards by content
   */
  static async searchCards(themeId: string, userId: string, query: string): Promise<Card[]> {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('theme_id', themeId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .or(`title.ilike.%${query}%,body.ilike.%${query}%`);

    if (error) {
      logger.error({ themeId, userId, query, error }, 'Failed to search cards');
      throw new Error('Failed to search cards');
    }

    return data || [];
  }
}
