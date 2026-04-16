'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStatusPoller } from '@/hooks/use-status-poller';

interface HoroscopeGeneratingProps {
  forecastId: string;
}

const STEP_DELAYS = [0, 5000, 15000, 28000];

export function HoroscopeGenerating({ forecastId }: HoroscopeGeneratingProps) {
  const t = useTranslations('horoscope');
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const didFire = useRef(false);
  const { failed } = useStatusPoller(`/api/forecasts/${forecastId}`);

  const STEP_LABELS = [
    t('generatingStep1'),
    t('generatingStep2'),
    t('generatingStep3'),
    t('generatingStep4'),
  ];

  // Advance progress indicators independently of network.
  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delayMs, i) =>
      setTimeout(() => setStepIndex(i + 1), delayMs),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fire generation exactly once (survives Strict Mode double-mount)
  useEffect(() => {
    if (didFire.current) return;
    didFire.current = true;

    fetch(`/api/forecasts/${forecastId}/generate`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('generation failed');
        router.refresh();
      })
      .catch(() => {
        /* poller will detect the error status */
      });
  }, [forecastId, router]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">{t('generatingErrorTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('generatingErrorDesc')}</p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()}>
          {t('refresh')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-12 text-center">
      <div className="relative flex items-center justify-center">
        <Sparkles className="size-8 text-primary opacity-80" />
        <Loader2 className="absolute size-14 animate-spin text-primary/20" />
      </div>
      <div>
        <p className="text-base font-semibold">{t('generatingTitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{STEP_LABELS[stepIndex]}</p>
      </div>
      <div className="flex gap-2">
        {STEP_DELAYS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full transition-all duration-700 ${i <= stepIndex ? 'bg-primary' : 'bg-primary/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
