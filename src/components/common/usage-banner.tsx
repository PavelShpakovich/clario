'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LOW_CARDS_THRESHOLD } from '@/lib/constants';
import { useSubscription } from '@/hooks/use-subscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** Compact warning/error banner — only renders when user is ≤ LOW_CARDS_THRESHOLD or at limit. */
export function UsageBanner() {
  const t = useTranslations();
  const { status, isLoading } = useSubscription();

  if (isLoading || !status) return null;

  const { usage } = status;
  const isExhausted = usage.cardsRemaining === 0;
  const isLow = !isExhausted && usage.cardsRemaining <= LOW_CARDS_THRESHOLD;

  if (!isExhausted && !isLow) return null;

  return (
    <Alert
      variant={isExhausted ? 'destructive' : 'default'}
      className={`mb-6 animate-in fade-in slide-in-from-top-2 duration-300 ${
        isLow ? 'border-warning/40 bg-warning/5 text-warning-foreground [&>svg]:text-warning' : ''
      }`}
    >
      {isExhausted ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <div className="flex items-start justify-between gap-4 w-full">
        <div>
          <AlertTitle>
            {isExhausted
              ? t('usage.limitReachedBannerTitle')
              : t('usage.lowCardsBannerTitle', { count: usage.cardsRemaining })}
          </AlertTitle>
          <AlertDescription>
            {t('usage.periodUsage', { generated: usage.cardsGenerated, limit: usage.cardsLimit })}
          </AlertDescription>
        </div>
        <Button
          asChild
          size="sm"
          variant={isExhausted ? 'destructive' : 'outline'}
          className="shrink-0 h-7 text-xs"
        >
          <Link href="/settings#plan">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            {t('usage.upgradeCta')}
          </Link>
        </Button>
      </div>
    </Alert>
  );
}
