'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
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
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';
import { READING_TYPES } from '@/lib/astrology/constants';
import type { ReadingType } from '@/lib/astrology/types';

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
  const [isPending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<ReadingType | null>(null);
  const [pendingType, setPendingType] = useState<ReadingType | null>(null);
  const [natalCost, setNatalCost] = useState<number>(1);
  const [isFree, setIsFree] = useState(false);
  const isSubmittingRef = useRef(false);
  const chartNotReady = chartStatus !== undefined && chartStatus !== 'ready';

  useEffect(() => {
    fetch('/api/credits/pricing')
      .then(
        (r) =>
          r.json() as Promise<{
            costs?: { natal_report?: number };
            freeProducts?: string[];
          }>,
      )
      .then((data) => {
        if (data.costs?.natal_report) setNatalCost(data.costs.natal_report);
        if (data.freeProducts?.includes('natal_report')) setIsFree(true);
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

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
          const msg =
            data.error === 'insufficient_credits'
              ? tCredits('insufficientTitle')
              : data.error || t('error');
          throw new Error(msg);
        }

        router.push(`/readings/${data.reading.id}`);
      } catch (error) {
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
