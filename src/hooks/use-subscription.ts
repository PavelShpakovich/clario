'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionResponse } from '@/lib/subscriptions/types';
import { profileApi } from '@/services/profile-api';

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await profileApi.getSubscription();
      setStatus(data);
    } catch {
      // silently ignore — status stays null
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, isLoading, refresh };
}
