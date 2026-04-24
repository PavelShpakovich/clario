'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { readingsApi } from '@/services/readings-api';

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
        const data = await readingsApi.createReading({
          chartId,
          readingType,
          replaceReadingId: readingId,
        });

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
