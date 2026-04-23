'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, History, Package, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceminor: number | null;
  currency: string;
}

interface CreditCosts {
  natal_report: number;
  compatibility_report: number;
  forecast_report: number;
  follow_up_pack: number;
}

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  note: string | null;
  created_at: string;
}

export default function StorePage() {
  const t = useTranslations('credits');
  const [balance, setBalance] = useState<number>(0);
  const [forecastAccessUntil, setForecastAccessUntil] = useState<string | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [costs, setCosts] = useState<CreditCosts | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/credits/balance').then((r) => r.json()),
      fetch('/api/credits/packs').then((r) => r.json()),
      fetch('/api/credits/pricing').then((r) => r.json()),
      fetch('/api/credits/history?pageSize=10').then((r) => r.json()),
    ]).then(([balanceData, packsData, pricingData, historyData]) => {
      setBalance(balanceData.balance ?? 0);
      setForecastAccessUntil(balanceData.forecastAccessUntil ?? null);
      setPacks(packsData.packs ?? []);
      setCosts(pricingData.costs ?? null);
      setTransactions(historyData.transactions ?? []);
      setIsLoading(false);
    });
  }, []);

  const reasonLabel = (reason: string) => {
    const key = `reason${reason
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}` as Parameters<typeof t>[0];
    try {
      return t(key);
    } catch {
      return reason;
    }
  };

  const costItems = costs
    ? [
        { label: t('natalReport'), cost: costs.natal_report },
        { label: t('compatibilityReport'), cost: costs.compatibility_report },
        { label: t('forecastPack'), cost: costs.forecast_report },
        { label: t('chatPack'), cost: costs.follow_up_pack },
      ]
    : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('storeTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('storeDescription')}</p>
      </div>

      {isLoading ? (
        <>
          {/* Balance card skeleton */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 p-6">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Balance card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('yourBalance')}</p>
                <p className="text-3xl font-bold">
                  {balance}{' '}
                  <span className="text-lg font-normal text-muted-foreground">
                    {t('creditsUnit')}
                  </span>
                </p>
                {forecastAccessUntil && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('forecastAccessActive', {
                      date: new Date(forecastAccessUntil).toLocaleDateString('ru-RU'),
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Credit packs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  {t('creditPacks')}
                </CardTitle>
                <CardDescription>{t('betaNote')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {packs.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-semibold">{pack.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('packCredits', { count: pack.credits })}
                      </p>
                    </div>
                    <div className="text-right">
                      {pack.priceminor !== null ? (
                        <p className="font-semibold">
                          {(pack.priceminor / 100).toFixed(2)} {pack.currency}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('comingSoon')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Credit costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5" />
                  {t('creditCosts')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {costItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <span className="text-sm">{item.label}</span>
                    <span className="font-semibold text-primary">
                      {item.cost} {t('creditsUnit')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Transaction history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5" />
                {t('purchaseHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noTransactions')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{reasonLabel(txn.reason)}</p>
                        {txn.note && (
                          <p className="text-xs text-muted-foreground truncate">{txn.note}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${txn.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}
                        >
                          {txn.amount > 0 ? '+' : ''}
                          {txn.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          → {txn.balance_after} {t('creditsUnit')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
