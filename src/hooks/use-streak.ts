import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// Simple in-memory cache since streak doesn't change frequently
let streakCache: { value: number; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useStreak() {
  const { data: session } = useSession();
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    // Return cached value if still fresh
    if (streakCache && Date.now() - streakCache.timestamp < CACHE_DURATION) {
      setStreak(streakCache.value);
      setLoading(false);
      return;
    }

    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        next: { revalidate: 300 }, // Cache for 5 minutes
      });
      if (res.ok) {
        const data = (await res.json()) as { streak_count: number };
        const value = data.streak_count || 0;

        // Update cache
        streakCache = { value, timestamp: Date.now() };
        setStreak(value);
      }
    } catch {
      // Silently fail - user still sees UI
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void fetchStreak();
  }, [fetchStreak]);

  return { streak, loading, refetch: fetchStreak };
}
