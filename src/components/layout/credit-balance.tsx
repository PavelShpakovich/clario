'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CREDITS_CHANGED_EVENT = 'credits:changed';

/** Call after any credit mutation to trigger an immediate balance refresh. */
export function refreshCreditBalance() {
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}

export function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
      try {
        const res = await fetch('/api/credits/balance', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { balance?: number };
        if (!cancelled) setBalance(data.balance ?? 0);
      } catch {
        // Silently ignore — balance is non-critical UI
      }
    }

    void fetchBalance();
    const interval = setInterval(() => void fetchBalance(), 30_000);

    function handleRefresh() {
      void fetchBalance();
    }
    window.addEventListener(CREDITS_CHANGED_EVENT, handleRefresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(CREDITS_CHANGED_EVENT, handleRefresh);
    };
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/store"
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
        'bg-primary/10 text-primary hover:bg-primary/20',
      )}
      title="Кредиты"
    >
      <Sparkles className="size-3.5" />
      <span>{balance}</span>
    </Link>
  );
}
