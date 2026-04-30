/**
 * ChartWheel — SVG natal chart wheel.
 *
 * Renders a classical Western-style astrological wheel:
 *   - Outer ring: 12 zodiac signs, element-colored sectors
 *   - Middle zone: house lines for the selected supported house system
 *   - Planets at their ecliptic longitudes with degree numbers
 *   - Collision avoidance: nearby planets spread to inner/outer radii
 *   - Aspect web connecting planets
 *   - ASC/DSC (violet) and MC/IC (emerald) prominent markers
 *
 * Coordinate convention: ASC is at 9 o'clock (left).
 * Increasing ecliptic longitude goes counterclockwise.
 *
 * Theme: fully adaptive — uses CSS custom properties (Tailwind classes)
 * so the wheel looks correct in both light and dark modes.
 */

interface WheelPosition {
  bodyKey: string;
  /** Full ecliptic longitude 0–360°, as stored in chart_positions.degree_decimal */
  degreeDecimal: number;
  retrograde: boolean;
}

interface WheelAspect {
  bodyA: string;
  bodyB: string;
  aspectKey: string;
  orbDecimal: number;
}

import type { HouseSystem } from '@/lib/astrology/constants';

export interface ChartWheelProps {
  positions: WheelPosition[];
  aspects?: WheelAspect[];
  houseSystem?: HouseSystem;
  ariaLabel?: string;
}

import { PLANET_COLORS } from '@/components/ui/astrology-icons';

// ─── zodiac ──────────────────────────────────────────────────────────────────

const SIGNS = [
  { key: 'aries', fill: 'rgba(239,68,68,0.14)', stroke: 'rgba(239,68,68,0.60)' }, // Fire — red
  { key: 'taurus', fill: 'rgba(34,197,94,0.14)', stroke: 'rgba(34,197,94,0.60)' }, // Earth — green
  { key: 'gemini', fill: 'rgba(234,179,8,0.14)', stroke: 'rgba(234,179,8,0.60)' }, // Air — yellow
  { key: 'cancer', fill: 'rgba(59,130,246,0.14)', stroke: 'rgba(59,130,246,0.60)' }, // Water — blue
  { key: 'leo', fill: 'rgba(249,115,22,0.14)', stroke: 'rgba(249,115,22,0.60)' }, // Fire — orange
  { key: 'virgo', fill: 'rgba(16,185,129,0.14)', stroke: 'rgba(16,185,129,0.60)' }, // Earth — emerald
  { key: 'libra', fill: 'rgba(168,85,247,0.14)', stroke: 'rgba(168,85,247,0.60)' }, // Air — purple
  { key: 'scorpio', fill: 'rgba(99,102,241,0.14)', stroke: 'rgba(99,102,241,0.60)' }, // Water — indigo
  { key: 'sagittarius', fill: 'rgba(245,158,11,0.14)', stroke: 'rgba(245,158,11,0.60)' }, // Fire — amber
  { key: 'capricorn', fill: 'rgba(107,114,128,0.14)', stroke: 'rgba(107,114,128,0.60)' }, // Earth — gray
  { key: 'aquarius', fill: 'rgba(6,182,212,0.14)', stroke: 'rgba(6,182,212,0.60)' }, // Air — cyan
  { key: 'pisces', fill: 'rgba(139,92,246,0.14)', stroke: 'rgba(139,92,246,0.60)' }, // Water — violet
] as const;

/**
 * Renders SVG path/line/circle primitives for a zodiac sign icon.
 * Coordinate space: 24×24. Intended for use inside a <g> with a scale transform.
 */
function ZodiacSignPaths({ sign }: { sign: string }) {
  switch (sign) {
    case 'aries':
      return (
        <>
          <path d="M12 20V10" />
          <path d="M12 10C12 7 9 4 6 5C4 5.5 3 8 4 10C5 12 8 12 8 12" />
          <path d="M12 10C12 7 15 4 18 5C20 5.5 21 8 20 10C19 12 16 12 16 12" />
        </>
      );
    case 'taurus':
      return (
        <>
          <circle cx="12" cy="14" r="5" />
          <path d="M7 9C7 9 8 7 12 7C16 7 17 9 17 9" />
          <path d="M5 7C5 7 6 4 12 4C18 4 19 7 19 7" />
        </>
      );
    case 'gemini':
      return (
        <>
          <path d="M8 5V19" />
          <path d="M16 5V19" />
          <path d="M6 8C8 7 10 7 12 7C14 7 16 7 18 8" />
          <path d="M6 16C8 17 10 17 12 17C14 17 16 17 18 16" />
        </>
      );
    case 'cancer':
      return (
        <>
          <path d="M17 8C17 6.5 15.5 5 13 5C10.5 5 9 6.5 9 8C9 9.5 10 11 12 11C14 11 15 12.5 15 14C15 15.5 13.5 17 11 17C8.5 17 7 15.5 7 14" />
          <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="17" cy="16" r="1.5" fill="currentColor" stroke="none" />
        </>
      );
    case 'leo':
      return (
        <>
          <path d="M6 14C6 11 8 9 10 9C12 9 13 11 13 11C13 11 14 8 17 8C19 8 20 10 19 12C18 14 16 14 15 14" />
          <path d="M15 14C15 16 13.5 18 12 18C10.5 18 9 16.5 9 15" />
        </>
      );
    case 'virgo':
      return (
        <>
          <path d="M5 7V15" />
          <path d="M5 7C5 7 7 5 9 7V15" />
          <path d="M9 7C9 7 11 5 13 7V15" />
          <path d="M13 12C13 14 15 16 17 15C19 14 19 12 17 11" />
          <path d="M13 15C15 17 16 18 16 18" />
        </>
      );
    case 'libra':
      return (
        <>
          <path d="M5 16H19" />
          <path d="M5 19H19" />
          <path d="M8 16C8 16 7 13 8 11C9.5 8 14.5 8 16 11C17 13 16 16 16 16" />
        </>
      );
    case 'scorpio':
      return (
        <>
          <path d="M4 7V15" />
          <path d="M4 7C4 7 6 5 8 7V15" />
          <path d="M8 7C8 7 10 5 12 7V15" />
          <path d="M12 15C12 17 14 19 16 18C18 17 19 15 18 13L20 11" />
          <path d="M20 11L18 11" />
          <path d="M20 11L20 13" />
        </>
      );
    case 'sagittarius':
      return (
        <>
          <path d="M13 5H19V11" />
          <path d="M19 5L8 16" />
          <path d="M5 12H14" />
        </>
      );
    case 'capricorn':
      return (
        <>
          <path d="M5 7V16" />
          <path d="M5 7C5 5 8 4 10 7V12C10 14 13 16 15 14C17 12 17 10 15 9C13 8 12 10 12 12C12 16 15 18 18 17" />
        </>
      );
    case 'aquarius':
      return (
        <>
          <path d="M4 10C5.5 8 7.5 8 9 10C10.5 12 12.5 12 14 10C15.5 8 17.5 8 19 10" />
          <path d="M4 15C5.5 13 7.5 13 9 15C10.5 17 12.5 17 14 15C15.5 13 17.5 13 19 15" />
        </>
      );
    case 'pisces':
      return (
        <>
          <path d="M7 5C4 8 4 16 7 19" />
          <path d="M17 5C20 8 20 16 17 19" />
          <path d="M5 12H19" />
        </>
      );
    default:
      return <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />;
  }
}

/**
 * Renders SVG path/line/circle primitives for a planet icon.
 * Coordinate space: 24×24. Intended for use inside a <g> with a scale transform.
 */
function PlanetSvgPaths({ planet }: { planet: string }) {
  switch (planet) {
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <line x1="12" y1="3" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="21" />
          <line x1="3" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21" y2="12" />
          <line x1="5.6" y1="5.6" x2="7" y2="7" />
          <line x1="17" y1="17" x2="18.4" y2="18.4" />
          <line x1="5.6" y1="18.4" x2="7" y2="17" />
          <line x1="17" y1="7" x2="18.4" y2="5.6" />
        </>
      );
    case 'moon':
      return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
    case 'mercury':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 16V21" />
          <path d="M9 19H15" />
          <path d="M9 8C9 8 10 6 12 6C14 6 15 8 15 8" />
        </>
      );
    case 'venus':
      return (
        <>
          <circle cx="12" cy="10" r="5" />
          <line x1="12" y1="15" x2="12" y2="21" />
          <line x1="9" y1="19" x2="15" y2="19" />
        </>
      );
    case 'mars':
      return (
        <>
          <circle cx="10" cy="14" r="5" />
          <line x1="14" y1="10" x2="20" y2="4" />
          <polyline points="15,4 20,4 20,9" />
        </>
      );
    case 'jupiter':
      return (
        <>
          <path d="M13 4V20" />
          <path d="M7 8C7 8 6 14 11 14H18" />
          <path d="M10 4C8 4 6 6 7 8" />
        </>
      );
    case 'saturn':
      return (
        <>
          <path d="M12 3V14" />
          <path d="M9 6H15" />
          <path d="M12 14C12 14 9 16 9 18C9 20 11 21 13 20C15 19 16 17 15 15" />
        </>
      );
    case 'uranus':
      return (
        <>
          <circle cx="12" cy="16" r="4" />
          <line x1="12" y1="12" x2="12" y2="4" />
          <line x1="9" y1="4" x2="9" y2="9" />
          <line x1="15" y1="4" x2="15" y2="9" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none" />
        </>
      );
    case 'neptune':
      return (
        <>
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="5" y1="17" x2="19" y2="17" />
          <path d="M6 8C6 8 5 12 8 13L12 8L16 13C19 12 18 8 18 8" />
        </>
      );
    case 'pluto':
      return (
        <>
          <circle cx="12" cy="7" r="3" />
          <path d="M9 13C9 13 8 16 12 16C16 16 15 13 15 13" />
          <line x1="12" y1="16" x2="12" y2="21" />
          <line x1="9" y1="19" x2="15" y2="19" />
        </>
      );
    default:
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
  }
}

/** Abbreviated Russian labels shown below each planet icon */
const PLANET_ABBR: Record<string, string> = {
  sun: 'Солн',
  moon: 'Луна',
  mercury: 'Мерк',
  venus: 'Вен',
  mars: 'Марс',
  jupiter: 'Юп',
  saturn: 'Сат',
  uranus: 'Уран',
  neptune: 'Непт',
  pluto: 'Плут',
};

// ─── aspects ──────────────────────────────────────────────────────────────────

const ASPECT_STYLES: Record<string, { stroke: string; dash?: string; opacity: number }> = {
  conjunction: { stroke: '#8B5CF6', opacity: 0.55 },
  sextile: { stroke: '#3B82F6', dash: '4,3', opacity: 0.4 },
  square: { stroke: '#EF4444', opacity: 0.5 },
  trine: { stroke: '#22C55E', dash: '6,3', opacity: 0.4 },
  opposition: { stroke: '#F97316', opacity: 0.5 },
};

// ─── SVG layout ───────────────────────────────────────────────────────────────

const SZ = 560; // viewBox size
const CX = SZ / 2;
const CY = SZ / 2;
const R_OUTER = 268; // outer edge of zodiac ring
const R_ZODIAC = 222; // inner edge of zodiac ring / outer planet zone
const R_PLANET = 188; // default planet icon radius
const R_INNER = 158; // inner wheel disc edge
const R_ASPECT = 88; // aspect line circle radius
const R_HOUSE = 124; // house number label radius
const R_CENTER = 24; // small center ornament radius

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Round a number to 2 decimal places as a string for SVG attributes. */
const f = (n: number) => n.toFixed(2);

/**
 * Convert ecliptic longitude to SVG screen coordinates.
 * ASC is placed at the left (9 o'clock). Increasing longitude → counterclockwise.
 */
function lonToXY(lon: number, ascDeg: number, r: number): [number, number] {
  const offset = (((lon - ascDeg) % 360) + 360) % 360;
  const angle = Math.PI - (offset * Math.PI) / 180;
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];
}

/**
 * Build an SVG path for a ring sector from lon1 to lon2 (counterclockwise).
 */
function sectorPath(
  lon1: number,
  lon2: number,
  asc: number,
  rOuter: number,
  rInner: number,
): string {
  const [x1o, y1o] = lonToXY(lon1, asc, rOuter);
  const [x2o, y2o] = lonToXY(lon2, asc, rOuter);
  const [x2i, y2i] = lonToXY(lon2, asc, rInner);
  const [x1i, y1i] = lonToXY(lon1, asc, rInner);
  const span = (lon2 - lon1 + 360) % 360;
  const largeArc = span > 180 ? 1 : 0;
  // outer arc: CCW on screen (sweep=0); inner arc: CW back (sweep=1)
  return [
    `M${f(x1o)},${f(y1o)}`,
    `A${rOuter},${rOuter},0,${largeArc},0,${f(x2o)},${f(y2o)}`,
    `L${f(x2i)},${f(y2i)}`,
    `A${rInner},${rInner},0,${largeArc},1,${f(x1i)},${f(y1i)}`,
    'Z',
  ].join(' ');
}

// ─── component ────────────────────────────────────────────────────────────────

/**
 * Spread planets that are within `minGapDeg` degrees to alternating inner/outer
 * radii so their symbols never overlap. Runs multiple passes for dense clusters.
 */
function assignRadii(
  planets: WheelPosition[],
  defaultR: number,
  minGapDeg = 12,
  step = 22,
): Map<string, number> {
  const map = new Map(planets.map((p) => [p.bodyKey, defaultR]));
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const diff = Math.abs(planets[i].degreeDecimal - planets[j].degreeDecimal);
        const ang = Math.min(diff, 360 - diff);
        if (ang < minGapDeg) {
          const ki = planets[i].bodyKey;
          const kj = planets[j].bodyKey;
          const ri = map.get(ki) ?? defaultR;
          const rj = map.get(kj) ?? defaultR;
          if (ri === rj) {
            map.set(ki, defaultR + step);
            map.set(kj, defaultR - step);
          } else if (Math.abs(ri - rj) < step * 0.5) {
            map.set(ki, ri + Math.sign(ri - defaultR || 1) * step * 0.5);
          }
        }
      }
    }
  }
  return map;
}

export function ChartWheel({
  positions,
  aspects = [],
  houseSystem = 'equal',
  ariaLabel = 'Natal chart wheel',
}: ChartWheelProps) {
  const ascPos = positions.find((p) => p.bodyKey === 'ascendant');
  const mcPos = positions.find((p) => p.bodyKey === 'midheaven');
  /** If ASC is unknown, default to 0° (Aries rising) — zodiac ring still shows. */
  const asc = ascPos?.degreeDecimal ?? 0;
  const mc = mcPos?.degreeDecimal;

  const planets = positions.filter((p) =>
    Object.prototype.hasOwnProperty.call(PLANET_ABBR, p.bodyKey),
  );

  const radiiMap = assignRadii(planets, R_PLANET);

  return (
    <svg
      viewBox={`0 0 ${SZ} ${SZ}`}
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto block w-full max-w-140"
      aria-label={ariaLabel}
      role="img"
    >
      <defs>
        {/* Subtle glow filter for angle markers */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Background disk — adapts to theme via CSS variable ─────────────── */}
      <circle cx={CX} cy={CY} r={R_OUTER + 6} className="fill-card stroke-border" strokeWidth="1" />

      {/* ── Zodiac ring sectors ─────────────────────────────────────────────── */}
      {SIGNS.map((sign, i) => (
        <path
          key={i}
          d={sectorPath(i * 30, (i + 1) * 30, asc, R_OUTER, R_ZODIAC)}
          fill={sign.fill}
          stroke={sign.stroke}
          strokeWidth="0.6"
        />
      ))}

      {/* ── Outer degree tick marks (every 5°, longer at sign boundaries) ──── */}
      {Array.from({ length: 72 }, (_, i) => {
        const lon = i * 5;
        const isBoundary = lon % 30 === 0;
        const tickLen = isBoundary ? 9 : 4;
        const [x1, y1] = lonToXY(lon, asc, R_OUTER - 1);
        const [x2, y2] = lonToXY(lon, asc, R_OUTER - 1 - tickLen);
        return (
          <line
            key={i}
            x1={f(x1)}
            y1={f(y1)}
            x2={f(x2)}
            y2={f(y2)}
            stroke="currentColor"
            strokeWidth={isBoundary ? 0.8 : 0.4}
            className={isBoundary ? 'text-foreground/25' : 'text-foreground/12'}
          />
        );
      })}

      {/* ── Zodiac sign icons (SVG paths at midpoint of each sector) ─────────── */}
      {SIGNS.map((sign, i) => {
        const [x, y] = lonToXY(i * 30 + 15, asc, (R_OUTER + R_ZODIAC) / 2);
        const sz = 19;
        const sc = sz / 24;
        return (
          <g
            key={i}
            transform={`translate(${f(x - sz / 2)},${f(y - sz / 2)}) scale(${sc})`}
            stroke={sign.stroke}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ZodiacSignPaths sign={sign.key} />
          </g>
        );
      })}

      {/* ── Ring borders ────────────────────────────────────────────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_ZODIAC}
        fill="none"
        stroke="currentColor"
        className="text-foreground/15"
        strokeWidth="1"
      />
      <circle
        cx={CX}
        cy={CY}
        r={R_INNER}
        className="fill-background/40"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeOpacity="0.12"
      />

      {/* ── House dividers ───────────────────────────────────────────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const baseCusp = houseSystem === 'whole_sign' ? Math.floor(asc / 30) * 30 : asc;
        const cusp = baseCusp + i * 30;
        const [x1, y1] = lonToXY(cusp, asc, R_ZODIAC);
        const [x2, y2] = lonToXY(cusp, asc, R_ASPECT * 0.55);
        const isAngular = i % 3 === 0; // houses 1, 4, 7, 10
        return (
          <line
            key={i}
            x1={f(x1)}
            y1={f(y1)}
            x2={f(x2)}
            y2={f(y2)}
            stroke="currentColor"
            strokeWidth={isAngular ? 1.2 : 0.5}
            className={isAngular ? 'text-foreground/35' : 'text-foreground/15'}
            strokeDasharray={isAngular ? undefined : '2,5'}
          />
        );
      })}

      {/* ── House numbers ───────────────────────────────────────────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const baseCusp = houseSystem === 'whole_sign' ? Math.floor(asc / 30) * 30 : asc;
        const mid = baseCusp + i * 30 + 15;
        const [x, y] = lonToXY(mid, asc, R_HOUSE);
        return (
          <text
            key={i}
            x={f(x)}
            y={f(y)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9.5"
            className="fill-muted-foreground/70"
          >
            {i + 1}
          </text>
        );
      })}

      {/* ── Aspect web ──────────────────────────────────────────────────────── */}
      {aspects
        .filter((a) =>
          ['conjunction', 'trine', 'square', 'opposition', 'sextile'].includes(a.aspectKey),
        )
        .slice(0, 24)
        .map((asp, i) => {
          const pa = planets.find((p) => p.bodyKey === asp.bodyA);
          const pb = planets.find((p) => p.bodyKey === asp.bodyB);
          if (!pa || !pb) return null;
          const [ax, ay] = lonToXY(pa.degreeDecimal, asc, R_ASPECT);
          const [bx, by] = lonToXY(pb.degreeDecimal, asc, R_ASPECT);
          const style = ASPECT_STYLES[asp.aspectKey] ?? { stroke: '#888', opacity: 0.3 };
          return (
            <line
              key={i}
              x1={f(ax)}
              y1={f(ay)}
              x2={f(bx)}
              y2={f(by)}
              stroke={style.stroke}
              strokeWidth="0.9"
              strokeOpacity={style.opacity}
              strokeDasharray={style.dash}
            />
          );
        })}

      {/* ── Planet icons ────────────────────────────────────────────────────── */}
      {planets.map((pos) => {
        const r = radiiMap.get(pos.bodyKey) ?? R_PLANET;
        const [x, y] = lonToXY(pos.degreeDecimal, asc, r);
        const color = (PLANET_COLORS as Record<string, string>)[pos.bodyKey] ?? '#888';
        const abbr = PLANET_ABBR[pos.bodyKey] ?? pos.bodyKey;
        const degInSign = Math.floor(pos.degreeDecimal % 30);
        const sz = 16;
        const sc = sz / 24;

        return (
          <g key={pos.bodyKey}>
            {/* Degree label — above planet circle */}
            <text
              x={f(x)}
              y={f(y - 20)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="7"
              fill={color}
              opacity="0.80"
              fontWeight="600"
            >
              {degInSign}°
            </text>

            {/* Planet circle — theme-adaptive background */}
            <circle
              cx={f(x)}
              cy={f(y)}
              r="14"
              className="fill-card"
              stroke={color}
              strokeWidth="1.4"
              strokeOpacity="0.90"
            />

            {/* Planet icon paths */}
            <g
              transform={`translate(${f(x - sz / 2)},${f(y - sz / 2)}) scale(${sc})`}
              stroke={color}
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <PlanetSvgPaths planet={pos.bodyKey} />
            </g>

            {/* Planet name abbreviation */}
            <text
              x={f(x)}
              y={f(y + 23)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fill={color}
              opacity="0.80"
              fontWeight="600"
            >
              {abbr}
            </text>

            {/* Retrograde marker */}
            {pos.retrograde && (
              <text x={f(x + 11)} y={f(y - 11)} fontSize="7.5" fill="#FB923C" fontWeight="bold">
                Rx
              </text>
            )}
          </g>
        );
      })}

      {/* ── ASC marker (violet) — left axis ─────────────────────────────────── */}
      {ascPos &&
        (() => {
          const [x1, y1] = lonToXY(asc, asc, R_OUTER);
          const [x2, y2] = lonToXY(asc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(asc - 14, asc, R_ZODIAC - 13);
          return (
            <>
              <line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#A78BFA"
                strokeWidth="2.5"
                strokeOpacity="1"
                filter="url(#glow)"
              />
              <text
                x={f(lx)}
                y={f(ly)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="#A78BFA"
                fontWeight="bold"
                letterSpacing="-0.3"
              >
                ASC
              </text>
            </>
          );
        })()}

      {/* ── DSC marker (violet, opposite ASC) — right axis ──────────────────── */}
      {ascPos &&
        (() => {
          const dsc = asc + 180;
          const [x1, y1] = lonToXY(dsc, asc, R_OUTER);
          const [x2, y2] = lonToXY(dsc, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(dsc + 14, asc, R_ZODIAC - 13);
          return (
            <>
              <line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#A78BFA"
                strokeWidth="1.5"
                strokeOpacity="0.65"
                filter="url(#glow)"
              />
              <text
                x={f(lx)}
                y={f(ly)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="#A78BFA"
                fontWeight="bold"
                letterSpacing="-0.3"
                opacity="0.75"
              >
                DSC
              </text>
            </>
          );
        })()}

      {/* ── MC marker (emerald) ─────────────────────────────────────────────── */}
      {mcPos &&
        (() => {
          const [x1, y1] = lonToXY(mc!, asc, R_OUTER);
          const [x2, y2] = lonToXY(mc!, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(mc! - 14, asc, R_ZODIAC - 13);
          return (
            <>
              <line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#34D399"
                strokeWidth="2"
                strokeOpacity="0.95"
                filter="url(#glow)"
              />
              <text
                x={f(lx)}
                y={f(ly)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="#34D399"
                fontWeight="bold"
                letterSpacing="-0.3"
              >
                MC
              </text>
            </>
          );
        })()}

      {/* ── IC marker (emerald, opposite MC) ────────────────────────────────── */}
      {mcPos &&
        (() => {
          const ic = mc! + 180;
          const [x1, y1] = lonToXY(ic, asc, R_OUTER);
          const [x2, y2] = lonToXY(ic, asc, R_ZODIAC - 2);
          const [lx, ly] = lonToXY(ic + 14, asc, R_ZODIAC - 13);
          return (
            <>
              <line
                x1={f(x1)}
                y1={f(y1)}
                x2={f(x2)}
                y2={f(y2)}
                stroke="#34D399"
                strokeWidth="1.5"
                strokeOpacity="0.55"
                filter="url(#glow)"
              />
              <text
                x={f(lx)}
                y={f(ly)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill="#34D399"
                fontWeight="bold"
                letterSpacing="-0.3"
                opacity="0.70"
              >
                IC
              </text>
            </>
          );
        })()}

      {/* ── Center ornament ─────────────────────────────────────────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_CENTER}
        className="fill-card"
        stroke="rgba(167,139,250,0.25)"
        strokeWidth="1"
      />
      <text
        x={CX}
        y={CY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        className="fill-primary/40"
      >
        ✦
      </text>
    </svg>
  );
}
