'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { READING_TYPES } from '@/lib/astrology/constants';
import type { ReadingType } from '@/lib/astrology/types';

interface CreateReadingButtonProps {
  chartId: string;
  chartStatus?: string;
}

export function CreateReadingButton({ chartId, chartStatus }: CreateReadingButtonProps) {
  const router = useRouter();
  const t = useTranslations('createReading');
  const tDetail = useTranslations('chartDetail');
  const [isPending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<ReadingType | null>(null);
  const isSubmittingRef = useRef(false);
  const chartNotReady = chartStatus !== undefined && chartStatus !== 'ready';

  const createReading = (readingType: ReadingType) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActiveType(readingType);
    startTransition(async () => {
      try {
        const response = await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId, readingType }),
        });

        const data = (await response.json()) as { error?: string; reading?: { id: string } };

        if (!response.ok || !data.reading) {
          throw new Error(data.error || t('error'));
        }

        toast.success(t('success'));
        router.push(`/readings/${data.reading.id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('error'));
      } finally {
        setActiveType(null);
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isPending || chartNotReady}
          title={chartNotReady ? tDetail('createReadingNotReady') : undefined}
        >
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {READING_TYPES.map((type) => (
          <DropdownMenuItem
            key={type}
            disabled={isPending || chartNotReady}
            onClick={() => createReading(type)}
          >
            {t(`type_${type}`)}
            {activeType === type && isPending ? (
              <span className="ml-2 text-xs text-muted-foreground">…</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
