import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BookmarksClient } from '@/components/dashboard/bookmarks-client';
import { listBookmarksForUser } from '@/lib/bookmarks';

export const metadata = {
  title: 'Bookmarks',
  description: 'Review your saved flashcards.',
};

export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const bookmarks = await listBookmarksForUser(session.user.id);

  return <BookmarksClient initialBookmarks={bookmarks} />;
}
