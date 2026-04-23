'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { refreshCreditBalance } from '@/components/layout/credit-balance';
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';

export function ForecastUnlockButton() {
  const t = useTranslations('horoscope');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [forecastCost, setForecastCost] = useState<number>(1);
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    fetch('/api/credits/pricing')
      .then(
        (r) =>
          r.json() as Promise<{
            costs?: { forecast_report?: number };
            freeProducts?: string[];
          }>,
      )
      .then((data) => {
        if (data.costs?.forecast_report) setForecastCost(data.costs.forecast_report);
        if (data.freeProducts?.includes('forecast_report')) setIsFree(true);
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  async function handleUnlock() {
    setLoading(true);
    try {
      const res = await fetch('/api/forecasts/access', { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (data.error === 'insufficient_credits') {
          toast.error(t('unlockForecastFailed'));
        } else {
          toast.error(data.error ?? t('unlockForecastFailed'));
        }
        return;
      }
      refreshCreditBalance();
      router.refresh();
    } catch {
      toast.error(t('unlockForecastFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ConfirmSpendDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        cost={forecastCost}
        onConfirm={() => {
          setConfirmOpen(false);
          void handleUnlock();
        }}
      />
      <Button
        onClick={() => (isFree ? void handleUnlock() : setConfirmOpen(true))}
        disabled={loading}
        className="gap-2"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {loading ? t('unlockingForecast') : isFree ? t('unlockForecastFree') : t('unlockForecast')}
      </Button>
    </>
  );
}
