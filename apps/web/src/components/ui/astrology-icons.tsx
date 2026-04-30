/**
 * Custom SVG astrology icons — zodiac signs and planets.
 *
 * Each icon is a clean geometric SVG path designed to be legible at small sizes
 * and visually distinctive. These replace Unicode symbols (♌ ♈ ☉ etc.) which
 * render inconsistently across platforms and look poor at small sizes.
 *
 * Usage:
 *   <ZodiacIcon sign="aries" size={24} className="text-red-400" />
 *   <PlanetIcon planet="sun" size={20} color="#F59E0B" />
 */

import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

// ─── ZODIAC SIGNS ────────────────────────────────────────────────────────────

/** Aries ♈ — two curved horns meeting at a point, fire sign */
export function ZodiacAries({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 20V10" />
      <path d="M12 10C12 7 9 4 6 5C4 5.5 3 8 4 10C5 12 8 12 8 12" />
      <path d="M12 10C12 7 15 4 18 5C20 5.5 21 8 20 10C19 12 16 12 16 12" />
    </svg>
  );
}

/** Taurus ♉ — circle with horns on top, earth sign */
export function ZodiacTaurus({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="14" r="5" />
      <path d="M7 9C7 9 8 7 12 7C16 7 17 9 17 9" />
      <path d="M5 7C5 7 6 4 12 4C18 4 19 7 19 7" />
    </svg>
  );
}

/** Gemini ♊ — twin vertical lines connected by two horizontal bars, air sign */
export function ZodiacGemini({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M8 5V19" />
      <path d="M16 5V19" />
      <path d="M6 8C8 7 10 7 12 7C14 7 16 7 18 8" />
      <path d="M6 16C8 17 10 17 12 17C14 17 16 17 18 16" />
    </svg>
  );
}

/** Cancer ♋ — two spirals facing each other, water sign */
export function ZodiacCancer({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M17 8C17 6.5 15.5 5 13 5C10.5 5 9 6.5 9 8C9 9.5 10 11 12 11C14 11 15 12.5 15 14C15 15.5 13.5 17 11 17C8.5 17 7 15.5 7 14" />
      <circle cx="7" cy="8" r="1.5" fill={color} stroke="none" />
      <circle cx="17" cy="16" r="1.5" fill={color} stroke="none" />
    </svg>
  );
}

/** Leo ♌ — lion's mane arc with a tail curl, fire sign */
export function ZodiacLeo({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M6 14C6 11 8 9 10 9C12 9 13 11 13 11C13 11 14 8 17 8C19 8 20 10 19 12C18 14 16 14 15 14" />
      <path d="M15 14C15 16 13.5 18 12 18C10.5 18 9 16.5 9 15" />
      <path d="M9 15C9 15 10 17 12 17" />
    </svg>
  );
}

/** Virgo ♍ — M shape with a curl, earth sign */
export function ZodiacVirgo({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M5 7V15" />
      <path d="M5 7C5 7 7 5 9 7V15" />
      <path d="M9 7C9 7 11 5 13 7V15" />
      <path d="M13 12C13 14 15 16 17 15C19 14 19 12 17 11" />
      <path d="M13 15C15 17 16 18 16 18" />
    </svg>
  );
}

/** Libra ♎ — balanced scales, a horizontal line with arc above, air sign */
export function ZodiacLibra({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M5 16H19" />
      <path d="M5 19H19" />
      <path d="M8 16C8 16 7 13 8 11C9.5 8 14.5 8 16 11C17 13 16 16 16 16" />
    </svg>
  );
}

/** Scorpio ♏ — M shape with an upward-pointing arrow tail, water sign */
export function ZodiacScorpio({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M4 7V15" />
      <path d="M4 7C4 7 6 5 8 7V15" />
      <path d="M8 7C8 7 10 5 12 7V15" />
      <path d="M12 15C12 17 14 19 16 18C18 17 19 15 18 13L20 11" />
      <path d="M20 11L18 11" />
      <path d="M20 11L20 13" />
    </svg>
  );
}

/** Sagittarius ♐ — upward diagonal arrow, fire sign */
export function ZodiacSagittarius({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M13 5H19V11" />
      <path d="M19 5L8 16" />
      <path d="M5 12H14" />
    </svg>
  );
}

/** Capricorn ♑ — stylised V-shape with fish tail curl, earth sign */
export function ZodiacCapricorn({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M5 7V16" />
      <path d="M5 7C5 5 8 4 10 7V12C10 14 13 16 15 14C17 12 17 10 15 9C13 8 12 10 12 12C12 16 15 18 18 17" />
    </svg>
  );
}

/** Aquarius ♒ — two wavy horizontal lines, air sign */
export function ZodiacAquarius({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M4 10C5.5 8 7.5 8 9 10C10.5 12 12.5 12 14 10C15.5 8 17.5 8 19 10" />
      <path d="M4 15C5.5 13 7.5 13 9 15C10.5 17 12.5 17 14 15C15.5 13 17.5 13 19 15" />
    </svg>
  );
}

/** Pisces ♓ — two vertical arcs facing each other connected by a bar, water sign */
export function ZodiacPisces({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M7 5C4 8 4 16 7 19" />
      <path d="M17 5C20 8 20 16 17 19" />
      <path d="M5 12H19" />
    </svg>
  );
}

// ─── ZODIAC ICON MAP ─────────────────────────────────────────────────────────

export const ZODIAC_ICON_MAP = {
  aries: ZodiacAries,
  taurus: ZodiacTaurus,
  gemini: ZodiacGemini,
  cancer: ZodiacCancer,
  leo: ZodiacLeo,
  virgo: ZodiacVirgo,
  libra: ZodiacLibra,
  scorpio: ZodiacScorpio,
  sagittarius: ZodiacSagittarius,
  capricorn: ZodiacCapricorn,
  aquarius: ZodiacAquarius,
  pisces: ZodiacPisces,
} as const;

export type ZodiacSign = keyof typeof ZODIAC_ICON_MAP;

/** Renders the correct zodiac icon for a given sign key. Falls back to a star. */
export function ZodiacIcon({
  sign,
  size = 24,
  color = 'currentColor',
  ...props
}: { sign: string } & IconProps) {
  const Icon = ZODIAC_ICON_MAP[sign as ZodiacSign];
  if (!Icon) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        {...props}
      >
        <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
      </svg>
    );
  }
  return <Icon size={size} color={color} {...props} />;
}

// ─── PLANET ICONS ────────────────────────────────────────────────────────────

/** Sun ☉ — circle with a dot in the center */
export function PlanetSun({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
      <line x1="12" y1="3" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21" />
      <line x1="3" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21" y2="12" />
      <line x1="5.6" y1="5.6" x2="7" y2="7" />
      <line x1="17" y1="17" x2="18.4" y2="18.4" />
      <line x1="5.6" y1="18.4" x2="7" y2="17" />
      <line x1="17" y1="7" x2="18.4" y2="5.6" />
    </svg>
  );
}

/** Moon ☽ — crescent shape */
export function PlanetMoon({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Mercury ☿ — circle over cross with horns on top */
export function PlanetMercury({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 16V21" />
      <path d="M9 19H15" />
      <path d="M9 8C9 8 10 6 12 6C14 6 15 8 15 8" />
    </svg>
  );
}

/** Venus ♀ — circle over cross */
export function PlanetVenus({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="10" r="5" />
      <line x1="12" y1="15" x2="12" y2="21" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

/** Mars ♂ — circle with diagonal arrow */
export function PlanetMars({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="10" cy="14" r="5" />
      <line x1="14" y1="10" x2="20" y2="4" />
      <polyline points="15,4 20,4 20,9" />
    </svg>
  );
}

/** Jupiter ♃ — 4-like glyph */
export function PlanetJupiter({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M13 4V20" />
      <path d="M7 8C7 8 6 14 11 14H18" />
      <path d="M10 4C8 4 6 6 7 8" />
    </svg>
  );
}

/** Saturn ♄ — cross with a curved lower part */
export function PlanetSaturn({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <path d="M12 3V14" />
      <path d="M9 6H15" />
      <path d="M12 14C12 14 9 16 9 18C9 20 11 21 13 20C15 19 16 17 15 15" />
    </svg>
  );
}

/** Uranus ♅ — circle with H-like glyph on top */
export function PlanetUranus({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="16" r="4" />
      <line x1="12" y1="12" x2="12" y2="4" />
      <line x1="9" y1="4" x2="9" y2="9" />
      <line x1="15" y1="4" x2="15" y2="9" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <circle cx="12" cy="4" r="1.2" fill={color} stroke="none" />
    </svg>
  );
}

/** Neptune ♆ — trident */
export function PlanetNeptune({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="5" y1="17" x2="19" y2="17" />
      <path d="M6 8C6 8 5 12 8 13L12 8L16 13C19 12 18 8 18 8" />
    </svg>
  );
}

/** Pluto ♇ — circle over crescent over cross */
export function PlanetPluto({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="7" r="3" />
      <path d="M9 13C9 13 8 16 12 16C16 16 15 13 15 13" />
      <line x1="12" y1="16" x2="12" y2="21" />
      <line x1="9" y1="19" x2="15" y2="19" />
    </svg>
  );
}

/** Ascendant ↑ — upward arrow in circle */
export function PlanetAscendant({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16V8" />
      <path d="M9 11L12 8L15 11" />
    </svg>
  );
}

/** Midheaven MC — diamond shape pointing up */
export function PlanetMidheaven({ size = 24, color = 'currentColor', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3L19 12L12 21L5 12Z" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

// ─── PLANET ICON MAP ─────────────────────────────────────────────────────────

export const PLANET_ICON_MAP = {
  sun: PlanetSun,
  moon: PlanetMoon,
  mercury: PlanetMercury,
  venus: PlanetVenus,
  mars: PlanetMars,
  jupiter: PlanetJupiter,
  saturn: PlanetSaturn,
  uranus: PlanetUranus,
  neptune: PlanetNeptune,
  pluto: PlanetPluto,
  ascendant: PlanetAscendant,
  midheaven: PlanetMidheaven,
} as const;

export type PlanetKey = keyof typeof PLANET_ICON_MAP;

/** Renders the correct planet icon for a given planet key. */
export function PlanetIcon({
  planet,
  size = 24,
  color = 'currentColor',
  ...props
}: { planet: string } & IconProps) {
  const Icon = PLANET_ICON_MAP[planet as PlanetKey];
  if (!Icon) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return <Icon size={size} color={color} {...props} />;
}

// ─── ELEMENT COLORS (for use with zodiac icons) ──────────────────────────────

/** Returns the Tailwind CSS color class for an element group */
export const ELEMENT_COLORS: Record<string, { text: string; bg: string; stroke: string }> = {
  fire: { text: 'text-orange-400', bg: 'bg-orange-500/10', stroke: '#fb923c' },
  earth: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', stroke: '#34d399' },
  air: { text: 'text-sky-400', bg: 'bg-sky-500/10', stroke: '#38bdf8' },
  water: { text: 'text-blue-400', bg: 'bg-blue-500/10', stroke: '#60a5fa' },
};

export const SIGN_ELEMENTS: Record<ZodiacSign, keyof typeof ELEMENT_COLORS> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
};

/** Planet accent colors (hex) */
export const PLANET_COLORS: Record<PlanetKey, string> = {
  sun: '#F59E0B',
  moon: '#93C5FD',
  mercury: '#A78BFA',
  venus: '#F472B6',
  mars: '#F87171',
  jupiter: '#FB923C',
  saturn: '#9CA3AF',
  uranus: '#34D399',
  neptune: '#60A5FA',
  pluto: '#8B8B9E',
  ascendant: '#C4B5FD',
  midheaven: '#6EE7B7',
};
