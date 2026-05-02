import { useCallback, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    setRefreshing(true);

    try {
      await onRefresh();
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  }, [onRefresh]);

  return { refreshing, handleRefresh };
}
