import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

export interface BookmarkListItem {
  cardId: string;
  createdAt: string;
  themeId: string;
  themeName: string;
  cardTitle: string;
  cardBody: string;
}

type BookmarkedCardRow = Database['public']['Tables']['bookmarked_cards']['Row'];
type CardRow = Database['public']['Tables']['cards']['Row'];
type ThemeRow = Database['public']['Tables']['themes']['Row'];

export async function listBookmarksForUser(userId: string): Promise<BookmarkListItem[]> {
  const { data: bookmarks, error: bookmarksError } = await supabaseAdmin
    .from('bookmarked_cards')
    .select('card_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (bookmarksError) {
    throw new Error('Failed to load bookmarks');
  }

  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const cardIds = bookmarks.map((bookmark) => bookmark.card_id);
  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('cards')
    .select('id, title, body, theme_id')
    .in('id', cardIds);

  if (cardsError) {
    throw new Error('Failed to load bookmarked cards');
  }

  const typedCards = (cards ?? []) as Pick<CardRow, 'id' | 'title' | 'body' | 'theme_id'>[];
  const themeIds = Array.from(
    new Set(
      typedCards.map((card) => card.theme_id).filter((themeId): themeId is string => !!themeId),
    ),
  );

  const { data: themes, error: themesError } = await supabaseAdmin
    .from('themes')
    .select('id, name')
    .in('id', themeIds);

  if (themesError) {
    throw new Error('Failed to load bookmarked themes');
  }

  const cardById = new Map(typedCards.map((card) => [card.id, card]));
  const themeById = new Map(
    ((themes ?? []) as Pick<ThemeRow, 'id' | 'name'>[]).map((theme) => [theme.id, theme]),
  );

  return (bookmarks as Pick<BookmarkedCardRow, 'card_id' | 'created_at'>[])
    .map((bookmark) => {
      const card = cardById.get(bookmark.card_id);
      if (!card?.theme_id) {
        return null;
      }

      const theme = themeById.get(card.theme_id);
      return {
        cardId: card.id,
        createdAt: bookmark.created_at,
        themeId: card.theme_id,
        themeName: theme?.name ?? 'Untitled theme',
        cardTitle: card.title,
        cardBody: card.body,
      } satisfies BookmarkListItem;
    })
    .filter((bookmark): bookmark is BookmarkListItem => bookmark !== null);
}
