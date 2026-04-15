import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tables } from '@/lib/supabase/types';
import { ReadingsList } from '@/components/astrology/readings-list';

export async function generateMetadata() {
  const t = await getTranslations('readingsPage');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

const db = supabaseAdmin;

type ReadingRow = Tables<'readings'>;

export const dynamic = 'force-dynamic';

export default async function ReadingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const t = await getTranslations('readingsPage');

  const { data: readings } = await db
    .from('readings')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('sectionLabel')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          {t('heading')}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t('description')}</p>
      </section>

      {!readings || readings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('noReadingsTitle')}</CardTitle>
            <CardDescription>{t('noReadingsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/charts/new">{t('createChart')}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/charts">{t('openCharts')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ReadingsList initialReadings={readings as ReadingRow[]} />
      )}
    </main>
  );
}
