'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chartsApi } from '@/services/charts-api';

export function ChartIntakeForm() {
  const router = useRouter();
  const t = useTranslations('chartForm');
  const [isPending, startTransition] = useTransition();
  const [birthTimeKnown, setBirthTimeKnown] = useState(true);
  const [form, setForm] = useState({
    label: '',
    personName: '',
    subjectType: 'self',
    birthDate: '',
    birthTime: '',
    city: '',
    country: '',
    timezone: '',
    houseSystem: 'placidus',
    notes: '',
  });

  const subjectOptions = [
    { value: 'self', label: t('subjectSelf') },
    { value: 'partner', label: t('subjectPartner') },
    { value: 'child', label: t('subjectChild') },
    { value: 'client', label: t('subjectClient') },
    { value: 'other', label: t('subjectOther') },
  ] as const;

  const houseSystemOptions = [
    { value: 'placidus', label: 'Placidus' },
    { value: 'whole_sign', label: t('houseWholeSigns') },
    { value: 'koch', label: 'Koch' },
    { value: 'equal', label: t('houseEqual') },
  ] as const;

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        await chartsApi.createChart({
          label: form.label,
          personName: form.personName,
          subjectType: form.subjectType as 'self' | 'partner' | 'child' | 'client' | 'other',
          birthDate: form.birthDate,
          birthTime: birthTimeKnown ? form.birthTime : undefined,
          birthTimeKnown,
          city: form.city,
          country: form.country,
          timezone: form.timezone || undefined,
          houseSystem: form.houseSystem as 'placidus' | 'whole_sign' | 'koch' | 'equal',
          notes: form.notes || undefined,
          locale: 'ru',
        });

        toast.success(t('successToast'));
        router.push('/charts');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('errorToast'));
      }
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('sectionLabel')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('title')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t('subtitle')}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('birthDataTitle')}</CardTitle>
          <CardDescription>{t('birthDataDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="label">{t('chartLabel')}</Label>
                <Input
                  id="label"
                  value={form.label}
                  onChange={(event) => update('label', event.target.value)}
                  placeholder={t('chartLabelPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="personName">{t('personName')}</Label>
                <Input
                  id="personName"
                  value={form.personName}
                  onChange={(event) => update('personName', event.target.value)}
                  placeholder={t('personNamePlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('subjectType')}</Label>
                <Select
                  value={form.subjectType}
                  onValueChange={(value) => update('subjectType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('houseSystem')}</Label>
                <Select
                  value={form.houseSystem}
                  onValueChange={(value) => update('houseSystem', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {houseSystemOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="birthDate">{t('birthDate')}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => update('birthDate', event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="birthTime">{t('birthTime')}</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setBirthTimeKnown((value) => !value)}
                  >
                    {birthTimeKnown ? t('birthTimeUnknown') : t('birthTimeKnown')}
                  </button>
                </div>
                <Input
                  id="birthTime"
                  type="time"
                  value={form.birthTime}
                  onChange={(event) => update('birthTime', event.target.value)}
                  disabled={!birthTimeKnown}
                  required={birthTimeKnown}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="city">{t('city')}</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  placeholder={t('cityPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">{t('country')}</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(event) => update('country', event.target.value)}
                  placeholder={t('countryPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">{t('timezone')}</Label>
                <Input
                  id="timezone"
                  value={form.timezone}
                  onChange={(event) => update('timezone', event.target.value)}
                  placeholder={t('timezonePlaceholder')}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={4}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? t('submitting') : t('submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
