import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { normalizeHouseSystem } from '@/lib/astrology/constants';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tables } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateReadingButton } from '@/components/astrology/create-reading-button';
import { RecalculateButton } from '@/components/astrology/recalculate-button';
import { ChartWheel } from '@/components/astrology/chart-wheel';
import {
  ZodiacIcon,
  PlanetIcon,
  PlanetSun,
  PlanetMoon,
  PlanetAscendant,
  PlanetMidheaven,
  PLANET_COLORS,
} from '@/components/ui/astrology-icons';

const db = supabaseAdmin;

type ChartPositionRow = Tables<'chart_positions'>;
type ChartAspectRow = Tables<'chart_aspects'>;

const HOUSE_SYSTEM_LABEL_KEY: Record<string, string> = {
  whole_sign: 'houseWholeSigns',
  equal: 'houseEqual',
};

// ── Astrology classification maps ─────────────────────────────────────────────

const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const SIGN_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  aries: 'cardinal',
  cancer: 'cardinal',
  libra: 'cardinal',
  capricorn: 'cardinal',
  taurus: 'fixed',
  leo: 'fixed',
  scorpio: 'fixed',
  aquarius: 'fixed',
  gemini: 'mutable',
  virgo: 'mutable',
  sagittarius: 'mutable',
  pisces: 'mutable',
};

const SIGN_RULER: Record<string, string> = {
  aries: 'mars',
  taurus: 'venus',
  gemini: 'mercury',
  cancer: 'moon',
  leo: 'sun',
  virgo: 'mercury',
  libra: 'venus',
  scorpio: 'pluto',
  sagittarius: 'jupiter',
  capricorn: 'saturn',
  aquarius: 'uranus',
  pisces: 'neptune',
};

const SIGN_KEYWORDS: Record<string, string> = {
  aries: 'Напор · Инициатива · Смелость',
  taurus: 'Стабильность · Чувственность · Терпение',
  gemini: 'Общение · Адаптация · Любопытство',
  cancer: 'Забота · Интуиция · Чувствительность',
  leo: 'Самовыражение · Творчество · Щедрость',
  virgo: 'Анализ · Точность · Практичность',
  libra: 'Гармония · Баланс · Дипломатия',
  scorpio: 'Интенсивность · Трансформация · Проницательность',
  sagittarius: 'Свобода · Философия · Оптимизм',
  capricorn: 'Амбиции · Дисциплина · Структура',
  aquarius: 'Оригинальность · Реформы · Гуманизм',
  pisces: 'Интуиция · Сострадание · Мечтательность',
};

const PLANET_MEANING: Record<string, string> = {
  sun: 'Личность, жизненная сила',
  moon: 'Эмоции, инстинкты',
  mercury: 'Мышление, общение',
  venus: 'Любовь, красота',
  mars: 'Действие, желание',
  jupiter: 'Рост, удача',
  saturn: 'Дисциплина, уроки',
  uranus: 'Перемены, свобода',
  neptune: 'Мечты, духовность',
  pluto: 'Трансформация, власть',
};

// Personal planets used for element/modality balance
const BALANCE_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

const ASPECT_META: Record<string, { symbol: string; color: string }> = {
  conjunction: { symbol: '☌', color: 'text-primary' },
  sextile: { symbol: '⚹', color: 'text-sky-500' },
  square: { symbol: '□', color: 'text-destructive' },
  trine: { symbol: '△', color: 'text-emerald-500' },
  opposition: { symbol: '☍', color: 'text-orange-400' },
};

// Natural display order for planets
const PLANET_ORDER = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

/** Format ecliptic longitude within sign as "15°23'" */
function formatDeg(degreeDecimal: number): string {
  const inSign = degreeDecimal % 30;
  const deg = Math.floor(inSign);
  const min = Math.round((inSign - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

export default async function ChartDetailPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { chartId } = await params;
  const t = await getTranslations('chartDetail');

  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!chart) notFound();

  const [{ data: snapshots }, { data: readings }] = await Promise.all([
    db
      .from('chart_snapshots')
      .select('id, warnings_json')
      .eq('chart_id', chartId)
      .order('snapshot_version', { ascending: false })
      .limit(1),
    db
      .from('readings')
      .select('id, title, reading_type, status, created_at, summary')
      .eq('chart_id', chartId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
  ]);

  const latestSnapshot = snapshots?.[0];
  const snapshotId = latestSnapshot?.id;
  const snapshotWarnings = Array.isArray(latestSnapshot?.warnings_json)
    ? (latestSnapshot.warnings_json as string[]).filter((w) => typeof w === 'string')
    : [];

  const [{ data: positions }, { data: aspects }] = await Promise.all([
    snapshotId
      ? db.from('chart_positions').select('*').eq('chart_snapshot_id', snapshotId)
      : Promise.resolve({ data: [] }),
    snapshotId
      ? db
          .from('chart_aspects')
          .select('*')
          .eq('chart_snapshot_id', snapshotId)
          .order('orb_decimal')
      : Promise.resolve({ data: [] }),
  ]);

  // Sort positions: Sun, Moon, ... then rest in natural order
  const sortedPlanets = (positions ?? [])
    .filter((p: ChartPositionRow) => !['ascendant', 'midheaven'].includes(p.body_key))
    .sort((a: ChartPositionRow, b: ChartPositionRow) => {
      const ai = PLANET_ORDER.indexOf(a.body_key);
      const bi = PLANET_ORDER.indexOf(b.body_key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const angles = (positions ?? []).filter((p: ChartPositionRow) =>
    ['ascendant', 'midheaven'].includes(p.body_key),
  );
  const normalizedHouseSystem = normalizeHouseSystem(chart.house_system);
  const houseSystemLabel =
    t(HOUSE_SYSTEM_LABEL_KEY[normalizedHouseSystem] as Parameters<typeof t>[0]) ??
    normalizedHouseSystem;

  const sunPos = sortedPlanets.find((p: ChartPositionRow) => p.body_key === 'sun');
  const moonPos = sortedPlanets.find((p: ChartPositionRow) => p.body_key === 'moon');
  const asc = angles.find((p: ChartPositionRow) => p.body_key === 'ascendant');

  // ── Chart stats ───────────────────────────────────────────────────────────
  const balancePlanets = (positions ?? []).filter((p: ChartPositionRow) =>
    BALANCE_BODIES.includes(p.body_key),
  );
  const elementCounts = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityCounts = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of balancePlanets) {
    const el = SIGN_ELEMENT[p.sign_key];
    const mod = SIGN_MODALITY[p.sign_key];
    if (el) elementCounts[el]++;
    if (mod) modalityCounts[mod]++;
  }

  const chartRulerKey = asc ? SIGN_RULER[asc.sign_key] : undefined;
  const chartRulerPos = chartRulerKey
    ? (positions ?? []).find((p: ChartPositionRow) => p.body_key === chartRulerKey)
    : undefined;

  // Day chart = Sun above the horizon (houses 7-12)
  const isDay = sunPos?.house_number != null && sunPos.house_number >= 7;
  const hasTimeData = chart.birth_time_known && asc != null;

  // Birth time display
  const birthTimeDisplay = chart.birth_time_known && chart.birth_time ? chart.birth_time : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Person hero ── */}
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {chart.person_name.charAt(0).toUpperCase()}
            </div>
            {/* Identity */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {chart.person_name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{chart.label}</p>
              {/* Big three badges */}
              {(sunPos ?? moonPos ?? asc) ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {sunPos ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <PlanetSun size={12} color={PLANET_COLORS.sun} />{' '}
                      {t(`signs.${sunPos.sign_key}` as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                  {moonPos ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                      <PlanetMoon size={12} color={PLANET_COLORS.moon} />{' '}
                      {t(`signs.${moonPos.sign_key}` as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                  {asc ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      <PlanetAscendant size={12} color={PLANET_COLORS.ascendant} />{' '}
                      {t(`signs.${asc.sign_key}` as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/charts/${chart.id}/edit`}>{t('editChart')}</Link>
            </Button>
            <RecalculateButton chartId={chart.id} />
            <Button asChild variant="outline" size="sm">
              <Link href="/charts">{t('backToCharts')}</Link>
            </Button>
            <CreateReadingButton chartId={chart.id} chartStatus={chart.status} />
          </div>
        </div>

        {/* Birth details row */}
        <dl className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('birthDateLabel')}
            </dt>
            <dd className="mt-0.5 font-medium">
              {chart.birth_date}
              {birthTimeDisplay ? ` · ${birthTimeDisplay}` : ` · ${t('birthTimeUnknown')}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('birthPlaceLabel')}
            </dt>
            <dd className="mt-0.5 font-medium">
              {chart.city}, {chart.country}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('houseSystemLabel')}
            </dt>
            <dd className="mt-0.5 font-medium">{houseSystemLabel}</dd>
          </div>
        </dl>
      </section>

      {/* ── Status banners ── */}
      {chart.status === 'pending' ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary">{t('statusPendingBannerTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('statusPendingBannerDesc')}</p>
        </div>
      ) : chart.status === 'error' ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm font-semibold text-destructive">{t('statusErrorBannerTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('statusErrorBannerDesc')}</p>
        </div>
      ) : null}

      {/* ── Calculation warnings ── */}
      {snapshotWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            {t('recalculateWarnings')}
          </p>
          <ul className="mt-1.5 list-disc pl-4 text-xs text-amber-700 dark:text-amber-500">
            {snapshotWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Notes ── */}
      {chart.notes ? (
        <div className="rounded-2xl border bg-muted/30 px-5 py-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('notesLabel')}
          </p>
          <p className="text-sm leading-relaxed text-foreground">{chart.notes}</p>
        </div>
      ) : null}

      {/* ── Chart Stats ── */}
      {balancePlanets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Elements */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Стихии
            </p>
            <div className="grid gap-3">
              {(
                [
                  { key: 'fire', label: 'Огонь', dot: 'bg-orange-500' },
                  { key: 'earth', label: 'Земля', dot: 'bg-emerald-600' },
                  { key: 'air', label: 'Воздух', dot: 'bg-sky-400' },
                  { key: 'water', label: 'Вода', dot: 'bg-blue-500' },
                ] as const
              ).map((el) => {
                const count = elementCounts[el.key];
                return (
                  <div key={el.key} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">{el.label}</span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: count }).map((_, i) => (
                        <span key={i} className={`h-2 w-2 rounded-full ${el.dot}`} />
                      ))}
                      {Array.from({ length: Math.max(0, 7 - count) }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-full bg-muted" />
                      ))}
                    </div>
                    <span className="w-4 text-right text-sm font-semibold tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modalities */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Качества
            </p>
            <div className="grid gap-3">
              {(
                [
                  { key: 'cardinal', label: 'Кардинальные', dot: 'bg-primary' },
                  { key: 'fixed', label: 'Фиксированные', dot: 'bg-purple-500' },
                  { key: 'mutable', label: 'Мутабельные', dot: 'bg-emerald-500' },
                ] as const
              ).map((mod) => {
                const count = modalityCounts[mod.key];
                return (
                  <div key={mod.key} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">{mod.label}</span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: count }).map((_, i) => (
                        <span key={i} className={`h-2 w-2 rounded-full ${mod.dot}`} />
                      ))}
                      {Array.from({ length: Math.max(0, 7 - count) }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-full bg-muted" />
                      ))}
                    </div>
                    <span className="w-4 text-right text-sm font-semibold tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart info */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              О карте
            </p>
            <div className="grid gap-4">
              {chartRulerPos && chartRulerKey ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <PlanetIcon
                      planet={chartRulerKey}
                      size={18}
                      color={
                        (PLANET_COLORS as Record<string, string>)[chartRulerKey] ?? 'currentColor'
                      }
                    />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Управитель карты</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {t(`planets.${chartRulerKey}` as Parameters<typeof t>[0])}
                      {chartRulerPos.sign_key ? (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          в {t(`signs.${chartRulerPos.sign_key}` as Parameters<typeof t>[0])}
                        </span>
                      ) : null}
                    </p>
                    {chartRulerPos.house_number ? (
                      <p className="text-xs text-muted-foreground">
                        {t('houseLabel', { number: chartRulerPos.house_number })}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {hasTimeData ? (
                <div>
                  <p className="text-xs text-muted-foreground">Тип карты</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {isDay ? '☀ Дневная карта' : '☽ Ночная карта'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDay
                      ? 'Солнце над горизонтом — Солнце, Сатурн и Юпитер сильнее'
                      : 'Солнце под горизонтом — Луна, Венера и Марс сильнее'}
                  </p>
                </div>
              ) : null}

              {!chartRulerPos && !hasTimeData ? (
                <p className="text-sm text-muted-foreground">
                  Добавьте место и время рождения для полного анализа
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Chart Wheel ── */}
      {sortedPlanets.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('chartWheel')}</h2>
          <div className="overflow-hidden rounded-2xl border bg-card p-4">
            <ChartWheel
              positions={[...sortedPlanets, ...angles].map((p: ChartPositionRow) => ({
                bodyKey: p.body_key,
                degreeDecimal: p.degree_decimal,
                retrograde: p.retrograde ?? false,
              }))}
              houseSystem={normalizedHouseSystem}
              aspects={(aspects ?? []).map((a: ChartAspectRow) => ({
                bodyA: a.body_a,
                bodyB: a.body_b,
                aspectKey: a.aspect_key,
                orbDecimal: a.orb_decimal,
              }))}
            />
          </div>
        </section>
      ) : null}

      {/* ── Positions ── */}
      {sortedPlanets.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('positions')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedPlanets.map((pos: ChartPositionRow) => {
              const planetColor =
                PLANET_COLORS[pos.body_key as keyof typeof PLANET_COLORS] ?? 'currentColor';
              const planetName =
                t(`planets.${pos.body_key}` as Parameters<typeof t>[0]) ?? pos.body_key;
              const signName =
                t(`signs.${pos.sign_key}` as Parameters<typeof t>[0]) ?? pos.sign_key;
              return (
                <div
                  key={pos.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  <span className="flex w-8 shrink-0 items-center justify-center">
                    <PlanetIcon planet={pos.body_key} size={20} color={planetColor} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold">{planetName}</span>
                      {pos.retrograde ? (
                        <span className="rounded bg-orange-100 px-1 text-[10px] font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          Rx
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground/60">
                        {PLANET_MEANING[pos.body_key] ?? ''}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <ZodiacIcon sign={pos.sign_key} size={12} />
                      <span className="font-medium">
                        {signName} {formatDeg(pos.degree_decimal)}
                      </span>
                      {pos.house_number != null ? (
                        <span>· {t('houseLabel', { number: pos.house_number })}</span>
                      ) : null}
                    </div>
                    {SIGN_KEYWORDS[pos.sign_key] ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/55 leading-tight">
                        {SIGN_KEYWORDS[pos.sign_key]}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Angles strip */}
          {angles.length > 0 ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {angles.map((pos: ChartPositionRow) => {
                const isAsc = pos.body_key === 'ascendant';
                const signName =
                  t(`signs.${pos.sign_key}` as Parameters<typeof t>[0]) ?? pos.sign_key;
                return (
                  <div
                    key={pos.id}
                    className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3"
                  >
                    <span className="flex w-8 shrink-0 items-center justify-center">
                      {isAsc ? (
                        <PlanetAscendant size={20} color={PLANET_COLORS.ascendant} />
                      ) : (
                        <PlanetMidheaven size={20} color={PLANET_COLORS.midheaven} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {isAsc ? t('ascendantLabel') : t('midheavenLabel')}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <ZodiacIcon sign={pos.sign_key} size={12} />
                        <span>
                          {signName} {formatDeg(pos.degree_decimal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Aspects ── */}
      {aspects && aspects.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('aspects')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {aspects.map((asp: ChartAspectRow) => {
              const planetA = t(`planets.${asp.body_a}` as Parameters<typeof t>[0]) ?? asp.body_a;
              const planetB = t(`planets.${asp.body_b}` as Parameters<typeof t>[0]) ?? asp.body_b;
              const meta = ASPECT_META[asp.aspect_key] ?? {
                symbol: asp.aspect_key,
                color: 'text-foreground',
              };
              return (
                <div
                  key={asp.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-sm"
                >
                  <span className={`w-6 shrink-0 text-center text-base font-bold ${meta.color}`}>
                    {meta.symbol}
                  </span>
                  <span className="flex-1 font-medium">
                    {planetA} <span className="text-muted-foreground">·</span> {planetB}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {asp.orb_decimal.toFixed(1)}° {t('orbSuffix')}
                    {asp.applying != null ? (
                      <span className="ml-1.5">
                        · {asp.applying ? t('applying') : t('separating')}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Readings ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('linkedReadings')}</h2>
        </div>

        {readings && readings.length > 0 ? (
          <div className="grid gap-3">
            {readings.map((reading) => {
              return (
                <Link
                  key={reading.id}
                  href={`/readings/${reading.id}`}
                  className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold group-hover:text-primary">
                        {reading.title}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {t(`readingTypes.${reading.reading_type}` as Parameters<typeof t>[0]) ??
                          String(reading.reading_type).replace(/_/g, ' ')}{' '}
                        · {new Date(reading.created_at).toLocaleDateString()}
                      </p>
                      {reading.summary ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {reading.summary}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant={
                        reading.status === 'ready'
                          ? 'default'
                          : reading.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="shrink-0"
                    >
                      {reading.status === 'ready'
                        ? t('statusReady')
                        : reading.status === 'error'
                          ? t('statusError')
                          : t('statusPending')}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">{t('noReadingsYet')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('noReadingsHint')}</p>
          </div>
        )}
      </section>
    </main>
  );
}
