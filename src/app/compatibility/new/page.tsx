'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Heart, Users, Briefcase, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCredits } from '@/components/providers/credits-provider';
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
import { ApiClientError } from '@/services/api-client';
import { chartsApi } from '@/services/charts-api';
import { compatibilityApi } from '@/services/compatibility-api';
import { COMPATIBILITY_TYPES, type CompatibilityType } from '@/lib/compatibility/types';

const TYPE_ICONS: Record<CompatibilityType, typeof Heart> = {
  romantic: Heart,
  friendship: Users,
  business: Briefcase,
  family: Home,
};

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
  const { getCost, isFreeProduct, refreshCredits } = useCredits();
  const searchParams = useSearchParams();
  const [charts, setCharts] = useState<ChartOption[]>([]);
  const [primaryId, setPrimaryId] = useState(searchParams.get('primaryChartId') ?? '');
  const [secondaryId, setSecondaryId] = useState('');
  const [compatibilityType, setCompatibilityType] = useState<CompatibilityType>('romantic');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const compatCost = getCost('compatibility_report');
  const isFree = isFreeProduct('compatibility_report');

  const TypeIcon = TYPE_ICONS[compatibilityType];

  useEffect(() => {
    chartsApi
      .listCharts()
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
      const data = await compatibilityApi.createReport({
        primaryChartId: primaryId,
        secondaryChartId: secondaryId,
        compatibilityType,
      });
      void refreshCredits();
      router.push(`/compatibility/${data.report.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'insufficient_credits') {
        setError(tCredits('insufficientTitle'));
      } else {
        setError(err instanceof Error ? err.message : t('createFailed'));
      }
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
            <TypeIcon className="size-5 text-primary" />
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
              {/* Compatibility type selector */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">{t('typeLabel')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPATIBILITY_TYPES.map((type) => {
                    const Icon = TYPE_ICONS[type];
                    const isSelected = compatibilityType === type;
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant="outline"
                        onClick={() => setCompatibilityType(type)}
                        className={cn(
                          'h-auto justify-start gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-normal',
                          isSelected
                            ? 'border-primary bg-primary/5 font-medium text-primary hover:bg-primary/10 hover:text-primary'
                            : 'text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            isSelected ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        <span>{t(`type_${type}`)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

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
                className="w-full gap-2"
              >
                {!submitting && <Sparkles className="size-4" />}
                {submitting ? t('creatingReport') : t('createReport')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
