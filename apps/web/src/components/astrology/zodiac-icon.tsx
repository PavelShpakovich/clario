import type { SVGProps, ReactElement } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ── Aries: two curved horns meeting at a point ────────────────────────────────
function Aries({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M12 20 C12 20 12 14 12 11 C12 7.5 9 4 6 6 C3 8 5 13 9 12" />
      <path d="M12 20 C12 20 12 14 12 11 C12 7.5 15 4 18 6 C21 8 19 13 15 12" />
    </svg>
  );
}

// ── Taurus: circle with two curved horns on top ───────────────────────────────
function Taurus({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <circle cx="12" cy="14" r="5" />
      <path d="M7 14 C7 10 4 7 4 4" />
      <path d="M17 14 C17 10 20 7 20 4" />
      <path d="M4 4 Q12 1 20 4" />
    </svg>
  );
}

// ── Gemini: two parallel columns connected at top and bottom ─────────────────
function Gemini({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <line x1="8" y1="5" x2="8" y2="19" />
      <line x1="16" y1="5" x2="16" y2="19" />
      <path d="M5 5 Q12 3 19 5" />
      <path d="M5 19 Q12 21 19 19" />
    </svg>
  );
}

// ── Cancer: two intertwined crescents (69) ────────────────────────────────────
function Cancer({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M6 9.5 C6 7.5 8 5.5 10 5.5 C14 5.5 16 8 16 9.5 C16 11 14 12 12 12 C10 12 8 11 8 9.5" />
      <path d="M18 14.5 C18 16.5 16 18.5 14 18.5 C10 18.5 8 16 8 14.5 C8 13 10 12 12 12 C14 12 16 13 16 14.5" />
    </svg>
  );
}

// ── Leo: circle with a spiral tail ───────────────────────────────────────────
function Leo({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <circle cx="13" cy="15" r="5" />
      <path d="M8 15 C8 15 4 14 4 10 C4 6 8 4 11 6 C14 8 13 10 10 10" />
    </svg>
  );
}

// ── Virgo: M with a looped tail ───────────────────────────────────────────────
function Virgo({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M4 7 L4 16" />
      <path d="M4 7 Q4 4 7 4 Q10 4 10 7 L10 16" />
      <path d="M10 7 Q10 4 13 4 Q16 4 16 7 L16 14 C16 17 18 18 20 17" />
    </svg>
  );
}

// ── Libra: two wavy arcs over a flat line ─────────────────────────────────────
function Libra({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <line x1="4" y1="18" x2="20" y2="18" />
      <path d="M4 15 Q8 9 12 13 Q16 9 20 15" />
    </svg>
  );
}

// ── Scorpio: M-shape with upward arrow ───────────────────────────────────────
function Scorpio({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M4 7 L4 16" />
      <path d="M4 7 Q4 4 7 4 Q10 4 10 7 L10 16" />
      <path d="M10 7 Q10 4 13 4 Q16 4 16 7 L16 13 L19 13" />
      <path d="M17 11 L19 13 L17 15" />
    </svg>
  );
}

// ── Sagittarius: diagonal arrow ───────────────────────────────────────────────
function Sagittarius({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <line x1="5" y1="19" x2="19" y2="5" />
      <path d="M11 5 L19 5 L19 13" />
    </svg>
  );
}

// ── Capricorn: V with a looping tail ─────────────────────────────────────────
function Capricorn({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M4 5 L9 15 C9 18 12 20 14 18 C16 16 15 13 13 13 C11 13 10 15 11 17" />
      <path d="M9 5 C9 5 13 5 16 7 C19 9 20 13 18 16" />
    </svg>
  );
}

// ── Aquarius: two wavy horizontal lines ──────────────────────────────────────
function Aquarius({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M3 10 Q6 7 9 10 Q12 13 15 10 Q18 7 21 10" />
      <path d="M3 15 Q6 12 9 15 Q12 18 15 15 Q18 12 21 15" />
    </svg>
  );
}

// ── Pisces: two arcs connected by a center line ───────────────────────────────
function Pisces({ size = 20, ...props }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...props}>
      <path d="M6 5 C4 8 4 16 6 19" />
      <path d="M18 5 C20 8 20 16 18 19" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────

const ZODIAC_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  aries: Aries,
  taurus: Taurus,
  gemini: Gemini,
  cancer: Cancer,
  leo: Leo,
  virgo: Virgo,
  libra: Libra,
  scorpio: Scorpio,
  sagittarius: Sagittarius,
  capricorn: Capricorn,
  aquarius: Aquarius,
  pisces: Pisces,
};

interface ZodiacIconProps extends IconProps {
  sign: string;
}

export function ZodiacIcon({ sign, size = 20, ...props }: ZodiacIconProps) {
  const Icon = ZODIAC_ICONS[sign.toLowerCase()];
  if (!Icon) return null;
  return <Icon size={size} {...props} />;
}
