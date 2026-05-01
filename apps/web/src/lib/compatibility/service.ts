import { NotFoundError, ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { generateStructuredOutputWithUsage } from '@/lib/llm/structured-generation';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refundReferenceDebitIfEligible } from '@/lib/credits/service';
import {
  structuredReadingSchema,
  type StructuredReadingOutput,
} from '@/lib/readings/report-schema';
import type { Json, TablesInsert } from '@/lib/supabase/types';

const db = supabaseAdmin;

// ─── Compatibility types ──────────────────────────────────────────────────────

export { COMPATIBILITY_TYPES, type CompatibilityType } from './types';
import type { CompatibilityType } from './types';

interface CompatibilityTypeConfig {
  promptVersion: string;
  titleSuffix: string;
  role: string;
  sections: string;
  mockSections: Array<{ key: string; title: string; content: string }>;
  planetWeights: Record<string, number>;
}

const COMPATIBILITY_CONFIGS: Record<CompatibilityType, CompatibilityTypeConfig> = {
  romantic: {
    promptVersion: 'compatibility-romantic-v1',
    titleSuffix: 'Синастрия',
    role: 'Ты — эксперт-астролог по синастрии и отношениям в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста романтических отношений.',
    sections: `(1) эмоциональный резонанс и глубина связи (взаимодействия Луна-Луна, Луна-Венера, Луна-ASC), (2) коммуникация и ментальная совместимость (аспекты Меркурий-Меркурий, Меркурий-ASC), (3) любовь, притяжение и ценности (кросс-аспекты Венера-Марс, Венера-Венера, Венера-ASC), (4) вызовы и зоны роста (напряжённые кросс-аспекты: квадратуры, оппозиции между ключевыми планетами), (5) долгосрочный потенциал и предназначение отношений (кросс-аспекты Сатурна, Юпитера, темы Северного узла)`,
    mockSections: [
      {
        key: 'emotional',
        title: 'Эмоциональный резонанс',
        content: 'Анализ эмоциональной связи и глубины контакта.',
      },
      {
        key: 'communication',
        title: 'Общение и мышление',
        content: 'Как партнёры понимают друг друга.',
      },
      { key: 'attraction', title: 'Влечение и ценности', content: 'Венера и Марс в синастрии.' },
      {
        key: 'challenges',
        title: 'Вызовы и рост',
        content: 'Напряжённые аспекты и как с ними работать.',
      },
      { key: 'potential', title: 'Долгосрочный потенциал', content: 'Сатурн и цель отношений.' },
    ],
    planetWeights: {
      sun: 3,
      moon: 3,
      ascendant: 2.5,
      venus: 2.5,
      mars: 2.5,
      mercury: 2,
      jupiter: 1.5,
      saturn: 1.5,
      uranus: 1,
      neptune: 1,
      pluto: 1.2,
      midheaven: 1,
    },
  },
  friendship: {
    promptVersion: 'compatibility-friendship-v1',
    titleSuffix: 'Дружеская совместимость',
    role: 'Ты — эксперт-астролог по синастрии в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста дружеских отношений.',
    sections: `(1) эмоциональный комфорт и доверие — насколько легко эти два человека чувствуют себя в безопасности и расслабленно друг с другом (взаимодействия Луна-Луна, Луна-Венера, Луна-ASC), (2) стиль общения, общий юмор и интеллектуальная синергия (аспекты Меркурий-Меркурий, Меркурий-Юпитер), (3) общие интересы, ценности и что притягивает этих друзей друг к другу (кросс-аспекты Венера-Венера, Юпитер-Юпитер, Солнце-Солнце), (4) потенциальные точки трения и как справляться с разногласиями (напряжённые кросс-аспекты: квадратуры, оппозиции), (5) взаимный рост, вдохновение и что эта дружба даёт каждому (темы Юпитера, Урана, Северного узла)`,
    mockSections: [
      {
        key: 'trust',
        title: 'Эмоциональный комфорт и доверие',
        content: 'Как легко вы чувствуете себя друг с другом.',
      },
      {
        key: 'communication',
        title: 'Общение и юмор',
        content: 'Стиль общения и интеллектуальная синергия.',
      },
      { key: 'values', title: 'Общие интересы и ценности', content: 'Что объединяет эту дружбу.' },
      {
        key: 'friction',
        title: 'Точки трения',
        content: 'Потенциальные разногласия и как их решать.',
      },
      { key: 'growth', title: 'Взаимный рост и вдохновение', content: 'Что дружба даёт каждому.' },
    ],
    planetWeights: {
      sun: 2,
      moon: 3,
      ascendant: 2,
      venus: 1.5,
      mars: 1,
      mercury: 2.5,
      jupiter: 2.5,
      saturn: 1.5,
      uranus: 1.5,
      neptune: 1,
      pluto: 1,
      midheaven: 0.5,
    },
  },
  business: {
    promptVersion: 'compatibility-business-v1',
    titleSuffix: 'Деловая совместимость',
    role: 'Ты — эксперт-астролог по синастрии в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста делового или профессионального партнёрства.',
    sections: `(1) стили лидерства и принятия решений — как каждый подходит к авторитету, инициативе и структуре (кросс-аспекты Солнце-Сатурн, Марс-Сатурн, Солнце-Марс), (2) коммуникация и переговоры — насколько эффективно эти двое обсуждают идеи, решают споры и приходят к согласию (аспекты Меркурий-Меркурий, Меркурий-Сатурн, Меркурий-Юпитер), (3) рабочая этика, амбиции и совпадение профессиональных целей (кросс-аспекты Марс-Марс, Сатурн-Сатурн, MC-MC, Юпитер-Сатурн), (4) потенциальные конфликты, динамика власти и конкурентные напряжения (напряжённые кросс-аспекты: квадратуры, оппозиции между Марсом, Плутоном, Сатурном), (5) долгосрочный профессиональный потенциал и взаимодополняющие сильные стороны (темы Юпитера, Сатурна, Северного узла, взаимодействия MC)`,
    mockSections: [
      {
        key: 'leadership',
        title: 'Лидерство и принятие решений',
        content: 'Как каждый подходит к инициативе и структуре.',
      },
      {
        key: 'communication',
        title: 'Коммуникация и переговоры',
        content: 'Эффективность обсуждения идей и решения споров.',
      },
      {
        key: 'ambition',
        title: 'Рабочий стиль и амбиции',
        content: 'Совместимость профессиональных целей.',
      },
      {
        key: 'conflicts',
        title: 'Конфликты и динамика власти',
        content: 'Потенциальные конкурентные напряжения.',
      },
      {
        key: 'potential',
        title: 'Профессиональный потенциал',
        content: 'Долгосрочные перспективы сотрудничества.',
      },
    ],
    planetWeights: {
      sun: 2.5,
      moon: 1.5,
      ascendant: 1.5,
      venus: 1,
      mars: 2.5,
      mercury: 2.5,
      jupiter: 2,
      saturn: 3,
      uranus: 1,
      neptune: 0.5,
      pluto: 1.5,
      midheaven: 2.5,
    },
  },
  family: {
    promptVersion: 'compatibility-family-v1',
    titleSuffix: 'Родственная совместимость',
    role: 'Ты — эксперт-астролог по синастрии в профессиональном астрологическом сервисе.\nТы анализируешь, как две натальные карты взаимодействуют между собой, чтобы раскрыть сильные стороны, вызовы и темы роста родственных отношений (родитель-ребёнок, братья/сёстры или другие близкие семейные связи).',
    sections: `(1) эмоциональная связь и взаимопонимание — насколько естественно эти родственники чувствуют потребности и настроения друг друга (взаимодействия Луна-Луна, Луна-Солнце, Луна-ASC), (2) стиль общения и как конфликты выражаются или подавляются (аспекты Меркурий-Меркурий, Меркурий-Луна, Меркурий-Сатурн), (3) общие ценности, традиции и чувство «дома», которое они создают вместе (кросс-аспекты Венера-Венера, Луна-IC, Солнце-Солнце, Юпитер-Луна), (4) точки напряжения и вопросы границ — где проявляются различия поколений или темпераментов (напряжённые кросс-аспекты: Сатурн-Луна, Плутон-Солнце, Марс-Сатурн), (5) взаимная поддержка, рост и чему каждый учится у другого в долгосрочной перспективе (темы Юпитера, Сатурна, Северного узла)`,
    mockSections: [
      {
        key: 'bond',
        title: 'Эмоциональная связь и понимание',
        content: 'Как естественно вы чувствуете потребности друг друга.',
      },
      {
        key: 'communication',
        title: 'Стиль общения',
        content: 'Как выражаются и решаются конфликты.',
      },
      {
        key: 'values',
        title: 'Общие ценности и традиции',
        content: 'Чувство «дома», которое вы создаёте вместе.',
      },
      {
        key: 'tension',
        title: 'Точки напряжения и границы',
        content: 'Различия темпераментов и поколений.',
      },
      { key: 'support', title: 'Поддержка и рост', content: 'Чему вы учите друг друга.' },
    ],
    planetWeights: {
      sun: 3,
      moon: 3.5,
      ascendant: 2,
      venus: 1.5,
      mars: 1.5,
      mercury: 2,
      jupiter: 2,
      saturn: 2.5,
      uranus: 1,
      neptune: 1,
      pluto: 1.2,
      midheaven: 0.5,
    },
  },
};

// ─── Harmony score computation ────────────────────────────────────────────────

const ASPECT_SCORE_DEFS = [
  { key: 'conjunction', angle: 0, orb: 8, weight: 0.85 },
  { key: 'sextile', angle: 60, orb: 4, weight: 0.6 },
  { key: 'square', angle: 90, orb: 7, weight: -0.5 },
  { key: 'trine', angle: 120, orb: 7, weight: 1 },
  { key: 'opposition', angle: 180, orb: 8, weight: -0.35 },
] as const;

const KEY_PLANETS = new Set([
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
  'ascendant',
  'midheaven',
]);

export interface HarmonyPositionRow {
  body_key: string;
  degree_decimal: number;
}

export function computeHarmonyScore(
  primary: HarmonyPositionRow[],
  secondary: HarmonyPositionRow[],
  compatibilityType: CompatibilityType = 'romantic',
): number {
  if (primary.length === 0 || secondary.length === 0) return 50;

  const weights = COMPATIBILITY_CONFIGS[compatibilityType].planetWeights;
  let totalScore = 0;
  let totalWeight = 0;

  for (const pA of primary) {
    if (!KEY_PLANETS.has(pA.body_key)) continue;
    for (const pB of secondary) {
      if (!KEY_PLANETS.has(pB.body_key)) continue;
      const diff = Math.abs(pA.degree_decimal - pB.degree_decimal);
      const angular = Math.min(diff, 360 - diff);
      for (const def of ASPECT_SCORE_DEFS) {
        const orbDistance = Math.abs(angular - def.angle);
        if (orbDistance <= def.orb) {
          const tightness = 1 - (orbDistance / def.orb) * 0.7;
          const pairWeight = (weights[pA.body_key] ?? 1) * (weights[pB.body_key] ?? 1);
          totalScore += def.weight * pairWeight * tightness;
          totalWeight += pairWeight * tightness;
          break;
        }
      }
    }
  }

  if (totalWeight === 0) return 50;
  const ratio = totalScore / totalWeight;
  return Math.round(Math.max(5, Math.min(98, 50 + ratio * 48)));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionRow {
  body_key: string;
  sign_key: string;
  house_number: number | null;
  degree_decimal: number;
  retrograde: boolean;
}

interface AspectRow {
  body_a: string;
  body_b: string;
  aspect_key: string;
  orb_decimal: number;
  applying: boolean | null;
}

function activeModelName() {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return env.QWEN_MODEL;
    case 'mock':
      return 'deterministic-reading-mock-v1';
    default:
      return 'unknown';
  }
}

async function persistCompatibilityFailureLog(
  reportId: string,
  userId: string,
  errorMessage: string,
  requestPayload: Json,
): Promise<void> {
  const row: TablesInsert<'generation_logs'> = {
    user_id: userId,
    entity_type: 'compatibility_report',
    entity_id: reportId,
    operation_key: 'compatibility.pipeline.synastry',
    provider: env.LLM_PROVIDER,
    model: activeModelName(),
    request_payload_json: requestPayload,
    response_payload_json: { status: 'error' } as Json,
    latency_ms: 0,
    usage_tokens: null,
    error_message: errorMessage,
  };

  await db
    .from('generation_logs')
    .insert(row)
    .then(({ error }) => {
      if (error) {
        logger.warn(
          { error, reportId, errorMessage },
          'compatibility: failed to persist precondition failure log',
        );
      }
    });
}

export function serializeChartForSynastry(
  label: string,
  personName: string,
  birthTimeKnown: boolean,
  positions: PositionRow[],
  aspects: AspectRow[],
): string {
  const posLines = positions
    .map(
      (p) =>
        `  - ${p.body_key} in ${p.sign_key}, house ${p.house_number ?? '?'}, ${p.degree_decimal.toFixed(2)}°${p.retrograde ? ' (R)' : ''}`,
    )
    .join('\n');
  const aspLines = aspects
    .map(
      (a) =>
        `  - ${a.body_a} ${a.aspect_key} ${a.body_b}, orb ${a.orb_decimal.toFixed(2)}°${a.applying != null ? `, applying=${a.applying}` : ''}`,
    )
    .join('\n');
  return `Chart: ${label} (${personName})\nBirth time known: ${birthTimeKnown ? 'yes' : 'no'}\nPositions:\n${posLines}\nAspects:\n${aspLines}`;
}

const SYNASTRY_ASPECT_DEFS = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'sextile', angle: 60, orb: 4 },
  { name: 'square', angle: 90, orb: 7 },
  { name: 'trine', angle: 120, orb: 7 },
  { name: 'opposition', angle: 180, orb: 8 },
] as const;

const SYNASTRY_PLANETS = [
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
  'ascendant',
  'midheaven',
] as const;

/** Compute inter-chart (cross) aspects between two sets of positions. */
export function computeCrossAspects(
  positionsA: PositionRow[],
  nameA: string,
  positionsB: PositionRow[],
  nameB: string,
): string {
  const planetsA = positionsA.filter((p) =>
    (SYNASTRY_PLANETS as readonly string[]).includes(p.body_key),
  );
  const planetsB = positionsB.filter((p) =>
    (SYNASTRY_PLANETS as readonly string[]).includes(p.body_key),
  );

  const found: Array<{ line: string; orb: number }> = [];

  for (const a of planetsA) {
    for (const b of planetsB) {
      const raw = Math.abs(a.degree_decimal - b.degree_decimal);
      const diff = raw > 180 ? 360 - raw : raw;
      for (const aspect of SYNASTRY_ASPECT_DEFS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          found.push({
            line: `  - ${nameA} ${a.body_key} ${aspect.name} ${nameB} ${b.body_key}, orb ${orb.toFixed(2)}°`,
            orb,
          });
          break;
        }
      }
    }
  }

  return found
    .sort((a, b) => a.orb - b.orb)
    .map((f) => f.line)
    .join('\n');
}

/** Fast: creates a pending compatibility record. */
export async function createPendingCompatibility(
  userId: string,
  primaryChartId: string,
  secondaryChartId: string,
  compatibilityType: CompatibilityType = 'romantic',
) {
  const { data: primary } = await db
    .from('charts')
    .select('id')
    .eq('id', primaryChartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!primary) throw new NotFoundError({ message: 'Primary chart not found' });

  const { data: secondary } = await db
    .from('charts')
    .select('id')
    .eq('id', secondaryChartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!secondary) throw new NotFoundError({ message: 'Secondary chart not found' });

  const [{ data: primarySnapshot }, { data: secondarySnapshot }] = await Promise.all([
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', primaryChartId)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', secondaryChartId)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!primarySnapshot || !secondarySnapshot) {
    throw new ValidationError({
      message: 'Both charts must have generated snapshots before compatibility can be created',
      context: {
        compatibilityType,
        primaryChartId,
        secondaryChartId,
        primarySnapshotFound: Boolean(primarySnapshot),
        secondarySnapshotFound: Boolean(secondarySnapshot),
      },
    });
  }

  const config = COMPATIBILITY_CONFIGS[compatibilityType];

  const { data: report, error } = await db
    .from('compatibility_reports')
    .insert({
      user_id: userId,
      primary_chart_id: primaryChartId,
      secondary_chart_id: secondaryChartId,
      status: 'pending',
      prompt_version: config.promptVersion,
      compatibility_type: compatibilityType,
    })
    .select('*')
    .single();

  if (error || !report) throw error ?? new Error('Failed to create compatibility report');

  return report;
}

/** Slow: fetches both charts and runs the LLM pipeline to generate the synastry report. */
export async function generateCompatibilityContent(
  reportId: string,
  userId: string,
): Promise<void> {
  const { data: report } = await db
    .from('compatibility_reports')
    .select('id, primary_chart_id, secondary_chart_id, status, compatibility_type')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Compatibility report not found' });

  if (report.status === 'ready' || report.status === 'generating') return;

  const compatibilityType = (report.compatibility_type as CompatibilityType | null) ?? 'romantic';
  const config = COMPATIBILITY_CONFIGS[compatibilityType];

  await db.from('compatibility_reports').update({ status: 'generating' }).eq('id', reportId);

  // Fetch both charts
  const [{ data: primaryChart }, { data: secondaryChart }] = await Promise.all([
    db
      .from('charts')
      .select('id, label, person_name, birth_time_known')
      .eq('id', report.primary_chart_id)
      .maybeSingle(),
    db
      .from('charts')
      .select('id, label, person_name, birth_time_known')
      .eq('id', report.secondary_chart_id)
      .maybeSingle(),
  ]);

  if (!primaryChart || !secondaryChart) {
    const errorMessage = 'Compatibility generation failed: chart lookup missing';
    logger.warn({ reportId, userId, compatibilityType }, 'compatibility: chart lookup missing');
    await persistCompatibilityFailureLog(reportId, userId, errorMessage, {
      compatibilityType,
      primaryChartId: report.primary_chart_id,
      secondaryChartId: report.secondary_chart_id,
      stage: 'chart_lookup',
    });
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  // Fetch snapshots for both charts
  const [{ data: primarySnapshot }, { data: secondarySnapshot }] = await Promise.all([
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', report.primary_chart_id)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('chart_snapshots')
      .select('id')
      .eq('chart_id', report.secondary_chart_id)
      .order('snapshot_version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!primarySnapshot || !secondarySnapshot) {
    const errorMessage = 'Compatibility generation failed: latest chart snapshot missing';
    logger.warn(
      {
        reportId,
        userId,
        compatibilityType,
        primarySnapshotFound: Boolean(primarySnapshot),
        secondarySnapshotFound: Boolean(secondarySnapshot),
      },
      'compatibility: latest chart snapshot missing for generation',
    );
    await persistCompatibilityFailureLog(reportId, userId, errorMessage, {
      compatibilityType,
      primaryChartId: report.primary_chart_id,
      secondaryChartId: report.secondary_chart_id,
      primarySnapshotFound: Boolean(primarySnapshot),
      secondarySnapshotFound: Boolean(secondarySnapshot),
      stage: 'snapshot_lookup',
    });
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  // Fetch positions and aspects for both charts in parallel
  const [
    { data: primaryPositions },
    { data: primaryAspects },
    { data: secondaryPositions },
    { data: secondaryAspects },
  ] = await Promise.all([
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', primarySnapshot.id)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', primarySnapshot.id)
      .order('orb_decimal', { ascending: true }),
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', secondarySnapshot.id)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', secondarySnapshot.id)
      .order('orb_decimal', { ascending: true }),
  ]);

  const primaryFacts = serializeChartForSynastry(
    primaryChart.label,
    primaryChart.person_name,
    primaryChart.birth_time_known,
    primaryPositions ?? [],
    primaryAspects ?? [],
  );
  const secondaryFacts = serializeChartForSynastry(
    secondaryChart.label,
    secondaryChart.person_name,
    secondaryChart.birth_time_known,
    secondaryPositions ?? [],
    secondaryAspects ?? [],
  );

  const crossAspectLines = computeCrossAspects(
    primaryPositions ?? [],
    primaryChart.person_name,
    secondaryPositions ?? [],
    secondaryChart.person_name,
  );

  const systemPrompt = `Весь JSON-ответ — каждое строковое поле — ОБЯЗАТЕЛЬНО должен быть написан на русском языке. Использование английского языка в любом поле недопустимо.

${config.role}
Не упоминай, что ты ИИ. Не давай медицинских, юридических, финансовых утверждений и фаталистических прогнозов.

КРИТИЧЕСКИЕ ПРАВИЛА:
- Используй ТОЛЬКО кросс-аспекты (межкартные аспекты) из раздела «Кросс-аспекты» в сообщении пользователя. НЕ придумывай аспекты, которых нет в данных.
- НЕ используй натальные аспекты (аспекты внутри одной карты) как кросс-аспекты. Кросс-аспект — это ВСЕГДА планета одного человека к планете другого.
- Если данных по Северному узлу, Лилит или другим точкам нет в кросс-аспектах — НЕ упоминай их и НЕ спекулируй об их влиянии.
- Используй правильную грамматику русского языка: «в соединении с Плутоном Павла» (творительный падеж), а не «с Плутон Павла».
- Названия планет: Солнце, Луна, Меркурий, Венера, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон, ASC (Асцендент), MC (Середина Неба). Слова «Мидиан», «Мидиана», «Мидиану» — ЗАПРЕЩЕНЫ. Используй только «MC» или «Середина Неба».
- Используй имена обоих людей (${primaryChart.person_name} и ${secondaryChart.person_name}) часто и естественно — минимум 5-7 раз каждое имя по всему тексту. Не заменяй имена местоимениями или абстракциями вроде «первый человек».

Верни ТОЛЬКО валидный JSON следующей формы:
{
  "title": string,
  "summary": string,
  "sections": [{ "key": string, "title": string, "content": string }],
  "placementHighlights": string[],
  "advice": string[],
  "disclaimers": string[],
  "metadata": { "locale": "ru", "readingType": "natal_overview", "promptVersion": string, "schemaVersion": string }
}

Требования:
- В заголовке укажи имена обоих людей, например: "${primaryChart.person_name} и ${secondaryChart.person_name} — ${config.titleSuffix}"
- Ровно 5 секций: ${config.sections}
- Каждая секция — 300-400 слов конкретного, обоснованного анализа с указанием реальных кросс-аспектов между двумя картами по имени (например, "Луна ${primaryChart.person_name} в тригоне к Венере ${secondaryChart.person_name}")
- Используй имена обоих людей естественно по всему тексту
- Ссылайся ТОЛЬКО на те кросс-аспекты, которые указаны в данных. Каждое упоминание аспекта должно соответствовать реальному кросс-аспекту из списка.
- placementHighlights — список 4-6 самых ярких межкартных аспектов (формат: "Планета Имени в аспекте к Планете Имени (орбита)")
- advice — 4-5 конкретных, практичных рекомендаций для этих отношений
- summary — 3-4 предложения, описывающие общую динамику отношений`;

  const userPrompt = `Проанализируй синастрию между этими двумя картами:

${primaryFacts}

---

${secondaryFacts}

Кросс-аспекты (межкартные аспекты, вычислены на сервере — самые значимые):
${crossAspectLines || '  — не найдены'}

Используй приведённые выше кросс-аспекты как основной материал для анализа. Это реальные межкартные аспекты между двумя людьми.`;

  let content: StructuredReadingOutput;
  let status: 'ready' | 'error' = 'ready';
  const startedAt = Date.now();

  try {
    const result = await generateStructuredOutputWithUsage({
      systemPrompt,
      userPrompt,
      schema: structuredReadingSchema,
      mockResponse: {
        title: `${primaryChart.person_name} и ${secondaryChart.person_name} — ${config.titleSuffix}`,
        summary: `Синастрия ${primaryChart.person_name} и ${secondaryChart.person_name} показывает яркую связь с рядом точек роста.`,
        sections: config.mockSections,
        placementHighlights: [],
        advice: ['Уделяйте внимание потребностям друг друга.'],
        disclaimers: ['Синастрия — это интерпретация потенциала, а не предсказание.'],
        metadata: {
          locale: 'ru',
          readingType: 'natal_overview',
          promptVersion: config.promptVersion,
          schemaVersion: '1',
        },
      },
    });
    content = result.content;

    const generationLogRow: TablesInsert<'generation_logs'> = {
      user_id: userId,
      entity_type: 'compatibility_report',
      entity_id: reportId,
      operation_key: 'compatibility.pipeline.synastry',
      provider: env.LLM_PROVIDER,
      model: activeModelName(),
      request_payload_json: { systemPrompt, userPrompt } as Json,
      response_payload_json: content as Json,
      latency_ms: Date.now() - startedAt,
      usage_tokens: result.usageTokens,
      error_message: null,
    };

    await db
      .from('generation_logs')
      .insert(generationLogRow)
      .then(({ error }) => {
        if (error)
          logger.warn({ error, reportId }, 'compatibility: failed to persist generation log');
      });
  } catch (err) {
    status = 'error';

    // Refund only if this report was actually charged.
    try {
      await refundReferenceDebitIfEligible(
        userId,
        'compatibility_report',
        reportId,
        'compatibility_debit',
        'refund_llm_failure',
      );
    } catch (refundErr) {
      logger.error(
        { err: refundErr, reportId },
        'compatibility: failed to refund credits after LLM failure',
      );
    }

    await db
      .from('generation_logs')
      .insert({
        user_id: userId,
        entity_type: 'compatibility_report',
        entity_id: reportId,
        operation_key: 'compatibility.pipeline.synastry',
        provider: env.LLM_PROVIDER,
        model: activeModelName(),
        request_payload_json: { systemPrompt, userPrompt } as Json,
        response_payload_json: { status: 'error' } as Json,
        latency_ms: Date.now() - startedAt,
        usage_tokens: null,
        error_message: err instanceof Error ? err.message : 'Compatibility generation failed',
      })
      .then(({ error }) => {
        if (error)
          logger.warn({ error, reportId }, 'compatibility: failed to persist error generation log');
      });
    logger.error({ err, reportId }, 'compatibility: generation failed');
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  await db
    .from('compatibility_reports')
    .update({
      status,
      summary: content.summary,
      rendered_content_json: content as Json,
      prompt_version: content.metadata.promptVersion,
      model_provider: env.LLM_PROVIDER,
      model_name: activeModelName(),
    })
    .eq('id', reportId);
}

/** Reset a failed compatibility report to pending so it can be re-generated. */
export async function resetCompatibilityForRetry(reportId: string, userId: string) {
  const { data: report } = await db
    .from('compatibility_reports')
    .select('id, status')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Compatibility report not found' });

  await db
    .from('compatibility_reports')
    .update({ status: 'pending', rendered_content_json: null })
    .eq('id', reportId);
}
