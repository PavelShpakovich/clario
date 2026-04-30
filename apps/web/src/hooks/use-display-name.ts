'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { profileApi } from '@clario/api-client';

// Module-level cache shared across all hook instances
let cachedName: string | null = null;
let cachedForUserId: string | null = null;
const listeners = new Set<(name: string | null) => void>();

/** Call this after saving the profile to push the new name to all subscribers instantly */
export function broadcastDisplayName(name: string) {
  cachedName = name;
  listeners.forEach((cb) => cb(name));
}

export function useDisplayName() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const cachedDisplayName = userId === cachedForUserId ? cachedName : null;

  const [displayName, setDisplayName] = useState<string | null>(cachedDisplayName);

  // Subscribe to instant broadcasts (e.g. after saving profile)
  useEffect(() => {
    listeners.add(setDisplayName);
    return () => {
      listeners.delete(setDisplayName);
    };
  }, []);

  useEffect(() => {
    if (userId !== cachedForUserId) {
      cachedName = null;
      cachedForUserId = userId;
    }
  }, [userId]);

  // Fetch display name from API when not yet cached for this user
  useEffect(() => {
    if (cachedDisplayName || !userId) return;

    let cancelled = false;

    profileApi
      .getProfile()
      .then((data) => {
        if (cancelled) return;
        const name = data.display_name ?? session?.user?.name ?? null;
        cachedName = name;
        cachedForUserId = userId;
        setDisplayName(name);
      })
      .catch(() => {
        // Fall back to session name — will retry on next mount
      });

    return () => {
      cancelled = true;
    };
  }, [cachedDisplayName, userId, session?.user?.name]);

  if (userId !== cachedForUserId) {
    return session?.user?.name ?? session?.user?.email ?? 'User';
  }

  return cachedDisplayName ?? displayName ?? session?.user?.name ?? session?.user?.email ?? 'User';
}
