import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, MapPin, Plus, BookOpen, Orbit, ArrowRight, Sparkles } from 'lucide-react';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const t = await getTranslations('dashboard');

  const [{ data: charts }, { data: readings }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('id, label, person_name, birth_date, city, country, status, subject_type')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    db
      .from('readings')
      .select('id, title, reading_type, status, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    db
      .from('profiles')
      .select('display_name, onboarding_completed_at')
      .eq('id', session.user.id)
      .maybeSingle(),
  ]);

  const name = profile?.display_name ?? session.user.name ?? '';
  const needsOnboarding = !profile?.onboarding_completed_at;
  const recentCharts = (charts ?? []).slice(0, 3);
  const recentReadings = (readings ?? []).slice(0, 4);
  const totalCharts = (charts ?? []).length;
  const totalReadings = (readings ?? []).length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {t('subheading')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {t('heading')}
          {name ? `, ${name}` : ''}
        </h1>
      </section>

      {/* Onboarding banner */}
      {needsOnboarding ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-warning-foreground">{t('onboardingBannerTitle')}</p>
            <p className="mt-0.5 text-sm text-warning-foreground/70">{t('onboardingBannerDesc')}</p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/charts/new">{t('onboardingBannerStart')}</Link>
          </Button>
        </div>
      ) : null}

      {/* Stats row */}
      <div className="flex gap-3">
        <Card className="flex flex-1 flex-col items-center justify-center py-6 gap-2 border-border/60 hover:border-primary/30 transition-colors">
          <Orbit className="size-5 text-primary" />
          <p className="text-2xl font-bold leading-none">{totalCharts}</p>
          <p className="text-xs text-muted-foreground">{t('statsCharts')}</p>
        </Card>
        <Card className="flex flex-1 flex-col items-center justify-center py-6 gap-2 border-border/60 hover:border-primary/30 transition-colors">
          <BookOpen className="size-5 text-primary" />
          <p className="text-2xl font-bold leading-none">{totalReadings}</p>
          <p className="text-xs text-muted-foreground">{t('statsReadings')}</p>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="flex flex-col justify-center gap-3 px-6 py-5 border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium shrink-0">{t('quickActions')}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/charts/new">
              <Plus />
              {t('createNewChart')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/charts">
              <Orbit />
              {t('viewAllCharts')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/readings">
              <BookOpen />
              {t('viewAllReadings')}
            </Link>
          </Button>
        </div>
      </Card>

      {/* Recent charts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('recentCharts')}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/charts" className="flex items-center gap-1">
              {t('viewAllCharts')} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        {recentCharts.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
            {t('noCharts')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recentCharts.map((chart) => (
              <Link key={chart.id} href={`/charts/${chart.id}`} className="group block">
                <Card className="h-full transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {chart.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">{chart.label}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {chart.person_name}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3 shrink-0" />
                      {chart.birth_date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3 shrink-0" />
                      {chart.city}, {chart.country}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent readings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('recentReadings')}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/readings" className="flex items-center gap-1">
              {t('viewAllReadings')} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        {recentReadings.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
            {t('noReadings')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentReadings.map((reading) => (
              <Link key={reading.id} href={`/readings/${reading.id}`} className="group block">
                <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all group-hover:border-primary/50">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {reading.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`readingTypes.${reading.reading_type}` as Parameters<typeof t>[0]) ??
                        reading.reading_type}{' '}
                      · {new Date(reading.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={reading.status === 'ready' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {reading.status === 'ready' ? t('statusReady') : t('statusPending')}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
