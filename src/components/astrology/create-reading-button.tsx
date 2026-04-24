'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCredits } from '@/components/providers/credits-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';
import { READING_TYPES } from '@/lib/astrology/constants';
import type { ReadingType } from '@/lib/astrology/types';
import { ApiClientError } from '@/services/api-client';
import { readingsApi } from '@/services/readings-api';

interface CreateReadingButtonProps {
  chartId: string;
  chartStatus?: string;
  className?: string;
}

export function CreateReadingButton({ chartId, chartStatus, className }: CreateReadingButtonProps) {
  const router = useRouter();
  const t = useTranslations('createReading');
  const tCredits = useTranslations('credits');
  const tDetail = useTranslations('chartDetail');
  const { getCost, isFreeProduct, refreshCredits } = useCredits();
  const [isPending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<ReadingType | null>(null);
  const [pendingType, setPendingType] = useState<ReadingType | null>(null);
  const isSubmittingRef = useRef(false);
  const chartNotReady = chartStatus !== undefined && chartStatus !== 'ready';
  const natalCost = getCost('natal_report');
  const isFree = isFreeProduct('natal_report');

  const createReading = (readingType: ReadingType) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setActiveType(readingType);
    startTransition(async () => {
      try {
        const data = await readingsApi.createReading({ chartId, readingType });
        void refreshCredits();
        router.push(`/readings/${data.reading.id}`);
      } catch (error) {
        if (error instanceof ApiClientError && error.code === 'insufficient_credits') {
          toast.error(tCredits('insufficientTitle'));
          return;
        }

        toast.error(error instanceof Error ? error.message : t('error'));
      } finally {
        setActiveType(null);
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <>
      <ConfirmSpendDialog
        open={pendingType !== null}
        onOpenChange={(open) => {
          if (!open) setPendingType(null);
        }}
        cost={natalCost}
        onConfirm={() => {
          const type = pendingType;
          setPendingType(null);
          if (type) createReading(type);
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isPending || chartNotReady}
            title={chartNotReady ? tDetail('createReadingNotReady') : undefined}
            className={className}
          >
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {READING_TYPES.map((type) => (
            <DropdownMenuItem
              key={type}
              disabled={isPending || chartNotReady}
              onClick={() => {
                if (isFree) {
                  createReading(type);
                } else {
                  setPendingType(type);
                }
              }}
            >
              {t(`type_${type}`)}
              {activeType === type && isPending ? (
                <span className="ml-2 text-xs text-muted-foreground">…</span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
