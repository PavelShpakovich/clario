'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// Module-level cache so all hook instances share state
let cachedName: string | null = null;
const listeners = new Set<(name: string) => void>();

/** Call this after saving the profile to push the new name to all subscribers instantly */
export function broadcastDisplayName(name: string) {
  cachedName = name;
  listeners.forEach((cb) => cb(name));
}

export function useDisplayName() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState<string | null>(
    cachedName ?? session?.user?.name ?? null,
  );

  // Subscribe to instant broadcasts (e.g. after saving profile)
  useEffect(() => {
    listeners.add(setDisplayName);
    return () => {
      listeners.delete(setDisplayName);
    };
  }, []);

  // Fetch display name from API on mount if not yet cached
  useEffect(() => {
    if (cachedName || !session?.user?.id) return;

    let cancelled = false;

    fetch('/api/profile')
      .then((res) => (res.ok ? (res.json() as Promise<{ display_name: string | null }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const name = data.display_name ?? session?.user?.name ?? null;
        cachedName = name;
        if (name) setDisplayName(name);
      })
      .catch(() => {
        // Silently fall back to session name
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.name]);

  return displayName ?? session?.user?.name ?? session?.user?.email ?? 'User';
}
