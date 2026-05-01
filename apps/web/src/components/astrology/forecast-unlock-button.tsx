'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCredits } from '@/components/providers/credits-provider';
import { runToastMutation } from '@/lib/mutation-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';
import { forecastsApi } from '@clario/api-client';

export function ForecastUnlockButton() {
  const t = useTranslations('horoscope');
  const router = useRouter();
  const { getCost, isFreeProduct, syncCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const forecastCost = getCost('forecast_report');
  const isFree = isFreeProduct('forecast_report');

  async function handleUnlock() {
    setLoading(true);
    try {
      await runToastMutation({
        action: () => forecastsApi.activateAccess(),
        silentSuccess: true,
        errorMessage: t('unlockForecastFailed'),
        toastKey: 'forecast-unlock',
        onSuccess: (data) => {
          syncCredits({
            newBalance: data.newBalance,
            forecastAccessUntil: data.forecastAccessUntil,
          });
          router.refresh();
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
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
