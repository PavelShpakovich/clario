'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfirmSpendDialog } from '@/components/common/confirm-spend-dialog';

interface ChartOption {
  id: string;
  label: string;
  person_name: string;
}

export default function NewCompatibilityPage() {
  const t = useTranslations('compatibility');
  const tCredits = useTranslations('credits');
  const tNav = useTranslations('navigation');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [charts, setCharts] = useState<ChartOption[]>([]);
  const [primaryId, setPrimaryId] = useState(searchParams.get('primaryChartId') ?? '');
  const [secondaryId, setSecondaryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [compatCost, setCompatCost] = useState<number>(1);
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    fetch('/api/credits/pricing')
      .then(
        (r) =>
          r.json() as Promise<{
            costs?: { compatibility_report?: number };
            freeProducts?: string[];
          }>,
      )
      .then((data) => {
        if (data.costs?.compatibility_report) setCompatCost(data.costs.compatibility_report);
        if (data.freeProducts?.includes('compatibility_report')) setIsFree(true);
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  useEffect(() => {
    fetch('/api/charts')
      .then((r) => r.json() as Promise<{ charts: ChartOption[] }>)
      .then(({ charts: data }) =>
        setCharts(
          (data ?? []).filter(
            (c: { status?: string } & ChartOption) => (c as { status: string }).status === 'ready',
          ),
        ),
      )
      .catch(() => setError(t('loadChartsFailed')))
      .finally(() => setLoading(false));
    // t is stable (next-intl hook) — no re-fetch needed on locale change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit() {
    if (!primaryId || !secondaryId || primaryId === secondaryId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryChartId: primaryId, secondaryChartId: secondaryId }),
      });
      const data = (await res.json()) as { report?: { id: string }; error?: string };
      if (!res.ok || !data.report) {
        const msg =
          data.error === 'insufficient_credits'
            ? tCredits('insufficientTitle')
            : (data.error ?? t('createFailed'));
        throw new Error(msg);
      }
      router.push(`/compatibility/${data.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createFailed'));
      setSubmitting(false);
    }
  }

  const chartOptions = charts.filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8 sm:px-6">
      <ConfirmSpendDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        cost={compatCost}
        onConfirm={() => {
          setConfirmOpen(false);
          void handleSubmit();
        }}
      />
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/compatibility">
            <ArrowLeft /> {tNav('back')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-primary" />
            <CardTitle>{t('newReport')}</CardTitle>
          </div>
          <CardDescription>{t('newReportDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('loadingCharts')}</p>
          ) : chartOptions.length < 2 ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              {t('notEnoughCharts')}{' '}
              <Link href="/charts/new" className="text-primary underline">
                {t('createReport')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('primaryChart')}</label>
                <Select value={primaryId} onValueChange={setPrimaryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectChartPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {chartOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id} disabled={c.id === secondaryId}>
                        {c.label} ({c.person_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center">
                <Heart className="size-5 text-muted-foreground" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('secondaryChart')}</label>
                <Select value={secondaryId} onValueChange={setSecondaryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectChartPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {chartOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id} disabled={c.id === primaryId}>
                        {c.label} ({c.person_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button
                onClick={() => {
                  if (isFree) {
                    void handleSubmit();
                  } else {
                    setConfirmOpen(true);
                  }
                }}
                disabled={!primaryId || !secondaryId || primaryId === secondaryId || submitting}
                className="w-full"
              >
                {submitting ? t('creatingReport') : t('createReport')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
