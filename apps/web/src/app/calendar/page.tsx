import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';

export const metadata: Metadata = { robots: { index: false } };
import { calculateNatalChart } from '@/lib/astrology/engine';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

export const dynamic = 'force-dynamic';

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

type MoonPhase =
  | 'new'
  | 'crescent'
  | 'first-quarter'
  | 'gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

function getMoonPhase(sunDeg: number, moonDeg: number): MoonPhase {
  const angle = (moonDeg - sunDeg + 360) % 360;
  if (angle < 22.5 || angle >= 337.5) return 'new';
  if (angle < 67.5) return 'crescent';
  if (angle < 112.5) return 'first-quarter';
  if (angle < 157.5) return 'gibbous';
  if (angle < 202.5) return 'full';
  if (angle < 247.5) return 'waning-gibbous';
  if (angle < 292.5) return 'last-quarter';
  return 'waning-crescent';
}

// SVG moon phase indicator — uses two-arc technique to render lit portion.
// Paths computed for a 12×12 viewBox (r=5, center=6,6).
// Outer arc: sweep=1 (waxing) or sweep=0 (waning) picks the lit half.
// Shadow ellipse: same sweep = crescent, opposite sweep = gibbous.
const MOON_PHASE_PATH: Partial<Record<MoonPhase, string>> = {
  crescent: 'M 6,1 A 5,5 0 0,1 6,11 A 2.5,5 0 0,1 6,1',
  'first-quarter': 'M 6,1 A 5,5 0 0,1 6,11 Z',
  gibbous: 'M 6,1 A 5,5 0 0,1 6,11 A 2.5,5 0 0,0 6,1',
  'waning-gibbous': 'M 6,1 A 5,5 0 0,0 6,11 A 2.5,5 0 0,1 6,1',
  'last-quarter': 'M 6,1 A 5,5 0 0,0 6,11 Z',
  'waning-crescent': 'M 6,1 A 5,5 0 0,0 6,11 A 2.5,5 0 0,0 6,1',
};

function MoonPhaseIcon({ phase, title }: { phase: MoonPhase; title: string }) {
  if (phase === 'new') {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-label={title}
        className="shrink-0 text-muted-foreground/50"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    );
  }
  if (phase === 'full') {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-label={title}
        className="shrink-0 text-amber-300"
      >
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      </svg>
    );
  }
  const d = MOON_PHASE_PATH[phase];
  if (!d) return null;
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-label={title}
      className="shrink-0 text-foreground/70"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}

const PHASE_TO_KEY: Record<MoonPhase, string> = {
  new: 'new',
  crescent: 'crescent',
  'first-quarter': 'firstQuarter',
  gibbous: 'gibbous',
  full: 'full',
  'waning-gibbous': 'waningGibbous',
  'last-quarter': 'lastQuarter',
  'waning-crescent': 'waningCrescent',
};

interface DayData {
  date: string;
  sunSign: string | null;
  moonSign: string | null;
  phase: MoonPhase;
}

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [t, tChart] = await Promise.all([
    getTranslations('calendar'),
    getTranslations('chartDetail'),
  ]);

  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });

  const skyData: DayData[] = await Promise.all(
    days.map(async (date): Promise<DayData> => {
      const dateStr = date.toISOString().slice(0, 10);
      try {
        const result = await calculateNatalChart({
          personName: 'sky',
          birthDate: dateStr,
          birthTime: '12:00',
          birthTimeKnown: true,
          city: 'London',
          country: 'GB',
          latitude: 51.5,
          longitude: 0,
          houseSystem: 'equal',
          label: 'sky',
          subjectType: 'other',
        });
        const byKey = Object.fromEntries(result.positions.map((p) => [p.bodyKey, p]));
        const sun = byKey.sun;
        const moon = byKey.moon;
        const phase =
          sun && moon ? getMoonPhase(sun.degreeDecimal, moon.degreeDecimal) : 'crescent';
        return {
          date: dateStr,
          sunSign: sun?.signKey ?? null,
          moonSign: moon?.signKey ?? null,
          phase,
        };
      } catch {
        return { date: dateStr, sunSign: null, moonSign: null, phase: 'crescent' };
      }
    }),
  );

  // Group by month
  const months: { name: string; days: DayData[] }[] = [];
  for (const day of skyData) {
    const d = new Date(day.date + 'T12:00:00Z');
    const monthKey = `${t(`months.${MONTH_KEYS[d.getUTCMonth()]}`)} ${d.getUTCFullYear()}`;
    const existing = months.find((m) => m.name === monthKey);
    if (existing) existing.days.push(day);
    else months.push({ name: monthKey, days: [day] });
  }

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('heading')}</h1>
          <p className="max-w-xl text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/horoscope">{t('horoscopeLink')}</Link>
        </Button>
      </section>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sun className="size-3 text-amber-500 shrink-0" /> {t('legendSun')}
        </span>
        <span className="flex items-center gap-1.5">
          <Moon className="size-3 text-sky-400 shrink-0" /> {t('legendMoon')}
        </span>
        <span className="flex items-center gap-1.5">
          <MoonPhaseIcon phase="new" title={t('phases.new')} /> {t('phases.new')}
        </span>
        <span className="flex items-center gap-1.5">
          <MoonPhaseIcon phase="full" title={t('phases.full')} /> {t('phases.full')}
        </span>
      </div>

      {/* Calendar months */}
      {months.map((month) => (
        <section key={month.name}>
          <h2 className="mb-4 text-base font-semibold">{month.name}</h2>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {month.days.map((day) => {
              const d = new Date(day.date + 'T12:00:00Z');
              const isToday = day.date === todayStr;
              const isSpecialPhase = day.phase === 'new' || day.phase === 'full';

              return (
                <div
                  key={day.date}
                  className={`rounded-xl border p-3 transition-colors ${
                    isToday
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : isSpecialPhase
                        ? 'border-border/80 bg-card'
                        : 'bg-card'
                  }`}
                >
                  {/* Day number + phase */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
                      {d.getUTCDate()}
                    </span>
                    <MoonPhaseIcon
                      phase={day.phase}
                      title={t(`phases.${PHASE_TO_KEY[day.phase]}`)}
                    />
                  </div>

                  {/* Sun */}
                  {day.sunSign ? (
                    <div className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Sun className="size-2.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {tChart(`signs.${day.sunSign}`) ?? day.sunSign}
                      </span>
                    </div>
                  ) : null}

                  {/* Moon */}
                  {day.moonSign ? (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Moon className="size-2.5 text-sky-400 shrink-0" />
                      <span className="truncate">
                        {tChart(`signs.${day.moonSign}`) ?? day.moonSign}
                      </span>
                    </div>
                  ) : null}

                  {/* Special phase label */}
                  {isSpecialPhase ? (
                    <p className="mt-1.5 text-[10px] font-medium text-primary">
                      {t(`phases.${PHASE_TO_KEY[day.phase]}`)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
