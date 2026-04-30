'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCredits } from '@/components/providers/credits-provider';
import { Button } from '@/components/ui/button';
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';
import { ApiClientError, forecastsApi } from '@clario/api-client';

interface HoroscopeRegenerateProps {
  forecastId: string;
}

export function HoroscopeRegenerate({ forecastId }: HoroscopeRegenerateProps) {
  const t = useTranslations('horoscope');
  const tCredits = useTranslations('credits');
  const router = useRouter();
  const { getCost, isFreeProduct, syncCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cost = getCost('forecast_report');
  const isFree = isFreeProduct('forecast_report');

  async function handleRegenerate() {
    setLoading(true);
    try {
      const data = await forecastsApi.regenerateForecast(forecastId);
      syncCredits({ newBalance: data.newBalance });
      // Server will see null content → render HoroscopeGenerating
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'insufficient_credits') {
        const details = (error.data ?? {}) as { required?: number; balance?: number };
        toast.error(
          tCredits('insufficientDescription', {
            required: details.required ?? cost,
            balance: details.balance ?? 0,
          }),
        );
      } else {
        toast.error(t('regenerateFailed'));
      }
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
