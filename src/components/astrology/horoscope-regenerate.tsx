'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';
import { refreshCreditBalance } from '@/components/layout/credit-balance';

interface HoroscopeRegenerateProps {
  forecastId: string;
}

export function HoroscopeRegenerate({ forecastId }: HoroscopeRegenerateProps) {
  const t = useTranslations('horoscope');
  const tCredits = useTranslations('credits');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cost, setCost] = useState<number>(1);
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
        if (data.costs?.forecast_report) setCost(data.costs.forecast_report);
        if (data.freeProducts?.includes('forecast_report')) setIsFree(true);
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/forecasts/${forecastId}/regenerate`, { method: 'POST' });
      if (res.status === 402) {
        const data = (await res.json()) as { required?: number; balance?: number };
        toast.error(
          tCredits('insufficientDescription', {
            required: data.required ?? cost,
            balance: data.balance ?? 0,
          }),
        );
        return;
      }
      if (!res.ok) throw new Error('regeneration failed');
      refreshCreditBalance();
      // Server will see null content → render HoroscopeGenerating
      router.refresh();
    } catch {
      toast.error(t('regenerateFailed'));
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    if (isFree) {
      void handleRegenerate();
    } else {
      setConfirmOpen(true);
    }
  }

  return (
    <>
      <ConfirmSpendDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        cost={cost}
        onConfirm={() => {
          setConfirmOpen(false);
          void handleRegenerate();
        }}
      />
      <Button variant="ghost" size="sm" onClick={handleClick} disabled={loading}>
        <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? t('regenerating') : t('regenerate')}
      </Button>
    </>
  );
}
