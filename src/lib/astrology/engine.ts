import { calculateChart } from 'celestine';
import type { HouseSystem } from '@/lib/astrology/constants';
import { toCelestineHouseSystem } from '@/lib/astrology/constants';
import type {
  BirthDataInput,
  CalculatedAspect,
  CalculatedPosition,
  ChartComputationResult,
} from '@/lib/astrology/types';

export interface AstrologyEngine {
  readonly providerKey: string;
  calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult>;
}

/* ---------- constants ---------- */

const SIGNS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

/* ---------- helpers ---------- */

function signForLongitude(lon: number): (typeof SIGNS)[number] {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return SIGNS[idx];
}

/** Convert a celestine body name ("Sun") to our internal key ("sun"). */
function bodyKeyFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

/** Resolve UTC hour (fractional) from birth data, applying timezone offset. */
function resolveUtcHour(
  input: BirthDataInput,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  warnings: string[],
): { utcHour: number; utcMinute: number } {
  if (!input.timezone) {
    return { utcHour: hour, utcMinute: minute };
  }

  let tzValid = false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
    tzValid = true;
  } catch {
    warnings.push(
      `Часовой пояс «${input.timezone}» не распознан — используйте формат IANA (например, Europe/Moscow). Время рождения обработано как UTC.`,
    );
  }

  if (!tzValid) return { utcHour: hour, utcMinute: minute };

  try {
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: input.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(approxUtc);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const displayed = new Date(
      Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour'),
        get('minute'),
        get('second'),
      ),
    );
    const offsetMs = displayed.getTime() - approxUtc.getTime();
    const actualUtc = new Date(approxUtc.getTime() - offsetMs);
    return {
      utcHour: actualUtc.getUTCHours(),
      utcMinute: actualUtc.getUTCMinutes(),
    };
  } catch {
    warnings.push(
      'Не удалось определить смещение часового пояса — время рождения обработано как UTC.',
    );
    return { utcHour: hour, utcMinute: minute };
  }
}

/* ---------- engine ---------- */

class RealAstrologyEngine implements AstrologyEngine {
  readonly providerKey = 'celestine-v1';

  async calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult> {
    const warnings: string[] = [];
    const houseSystem: HouseSystem = input.houseSystem;
    const celestineHouseSystem = toCelestineHouseSystem(houseSystem);

    const [year, month, day] = input.birthDate.split('-').map(Number);
    let utcHour: number;
    let utcMinute: number;
    const hasTime = input.birthTimeKnown && input.birthTime;
    const hasCoords = input.latitude != null && input.longitude != null;

    if (hasTime) {
      const [h, m] = input.birthTime!.split(':').map(Number);
      ({ utcHour, utcMinute } = resolveUtcHour(input, year, month, day, h, m, warnings));
    } else {
      utcHour = 12;
      utcMinute = 0;
      warnings.push(
        'Время рождения не указано. Дома, асцендент и середина неба не рассчитаны. Для позиций планет используется полдень UTC.',
      );
    }

    if (hasTime && !hasCoords) {
      warnings.push(
        'Координаты не указаны. Дома и углы карты не могут быть рассчитаны без широты и долготы.',
      );
    }

    const canComputeHouses = hasTime && hasCoords;

    const chart = calculateChart(
      {
        year,
        month,
        day,
        hour: utcHour,
        minute: utcMinute,
        second: 0,
        timezone: 0, // we already converted to UTC
        latitude: input.latitude ?? 0,
        longitude: input.longitude ?? 0,
      },
      {
        houseSystem: celestineHouseSystem,
        includeAsteroids: false,
        includeChiron: false,
        includeLilith: false,
        includeNodes: false,
        includeLots: false,
      },
    );

    // Build positions from celestine planets
    const positions: CalculatedPosition[] = [];

    for (const planet of chart.planets) {
      const bodyKey = bodyKeyFromName(planet.name);
      positions.push({
        bodyKey,
        signKey: signForLongitude(planet.longitude),
        degreeDecimal: Number(planet.longitude.toFixed(4)),
        retrograde: planet.isRetrograde,
        houseNumber: canComputeHouses ? planet.house : undefined,
      });
    }

    // Add ASC / MC if houses are computable
    if (canComputeHouses) {
      const ascLon = chart.angles.ascendant.longitude;
      const mcLon = chart.angles.midheaven.longitude;

      positions.push({
        bodyKey: 'ascendant',
        signKey: signForLongitude(ascLon),
        degreeDecimal: Number(ascLon.toFixed(4)),
        retrograde: false,
        houseNumber: 1,
      });
      positions.push({
        bodyKey: 'midheaven',
        signKey: signForLongitude(mcLon),
        degreeDecimal: Number(mcLon.toFixed(4)),
        retrograde: false,
        houseNumber: 10,
      });
    }

    // Build aspects from celestine
    const aspects: CalculatedAspect[] = chart.aspects.all.map((a) => ({
      bodyA: bodyKeyFromName(a.body1),
      bodyB: bodyKeyFromName(a.body2),
      aspectKey: a.type,
      orbDecimal: Number(a.deviation.toFixed(4)),
      applying: a.isApplying ?? undefined,
    }));

    // Identify dominant signs and bodies
    const innerPlanets = positions.filter((p) =>
      ['sun', 'moon', 'mercury', 'venus', 'mars', 'ascendant'].includes(p.bodyKey),
    );
    const dominantSigns = [...new Set(innerPlanets.map((p) => p.signKey))].slice(0, 3);
    const dominantBodies = innerPlanets.slice(0, 3).map((p) => p.bodyKey);

    const computedChart = {
      personName: input.personName,
      birthDate: input.birthDate,
      birthTime: input.birthTimeKnown ? (input.birthTime ?? null) : null,
      birthTimeKnown: input.birthTimeKnown,
      location: {
        city: input.city,
        country: input.country,
        timezone: input.timezone ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
      houseSystem,
      dominantSigns,
      dominantBodies,
      warnings,
    };

    return {
      provider: this.providerKey,
      snapshotVersion: 1,
      computedChart,
      warnings,
      positions,
      aspects,
    };
  }
}

export async function calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult> {
  const engine = await getAstrologyEngine();
  return engine.calculateNatalChart(input);
}

export async function getAstrologyEngine(): Promise<AstrologyEngine> {
  return new RealAstrologyEngine();
}
