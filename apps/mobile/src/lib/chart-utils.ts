import type { ChartRecord } from '@clario/api-client';
import { useColors } from '@/lib/colors';

export type Element = 'fire' | 'earth' | 'air' | 'water';
export type Colors = ReturnType<typeof useColors>;

// Map zodiac sign keys to their classical element
export const SIGN_ELEMENT: Record<string, Element> = {
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

export function getElementColors(
  element: Element | null,
  colors: Colors,
): { bg: string; text: string } {
  switch (element) {
    case 'fire':
      return { bg: colors.fireSubtle, text: colors.fire };
    case 'earth':
      return { bg: colors.earthSubtle, text: colors.earth };
    case 'air':
      return { bg: colors.airSubtle, text: colors.air };
    case 'water':
      return { bg: colors.waterSubtle, text: colors.water };
    default:
      return { bg: colors.primaryTint, text: colors.primary };
  }
}

export function getChartElement(chart: ChartRecord): Element | null {
  const sunSign = chart.big_three?.sun;
  if (!sunSign) return null;
  return SIGN_ELEMENT[sunSign.toLowerCase()] ?? null;
}

export function getSignElement(signKey: string): Element | null {
  return SIGN_ELEMENT[signKey.toLowerCase()] ?? null;
}
