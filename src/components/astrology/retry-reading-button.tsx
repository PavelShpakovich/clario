'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RetryReadingButtonProps {
  chartId: string;
  readingType: string;
  readingId: string;
}

export function RetryReadingButton({ chartId, readingType, readingId }: RetryReadingButtonProps) {
  const router = useRouter();
  const t = useTranslations('readingDetail');
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const handleRetry = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId, readingType, replaceReadingId: readingId }),
        });

        const data = (await response.json()) as { error?: string; reading?: { id: string } };

        if (!response.ok || !data.reading) {
          throw new Error(data.error ?? t('retryError'));
        }

        setDone(true);
        toast.success(t('retrySuccess'));
        router.push(`/readings/${data.reading.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('retryError'));
      }
    });
  };

  return (
    <Button variant="outline" onClick={handleRetry} disabled={isPending || done} className="gap-2">
      <RefreshCw className={isPending ? 'animate-spin size-4' : 'size-4'} />
      {isPending ? t('retryingReading') : t('retryReading')}
    </Button>
  );
}
