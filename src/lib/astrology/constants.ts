export const ASTROLOGY_SUPPORTED_LOCALES = ['en', 'ru'] as const;

export const HOUSE_SYSTEMS = ['whole_sign', 'equal'] as const;

export function normalizeHouseSystem(value?: string | null): (typeof HOUSE_SYSTEMS)[number] {
  if (value === 'whole_sign' || value === 'equal') return value;
  return 'equal';
}

export const CHART_SUBJECT_TYPES = ['self', 'partner', 'child', 'client', 'other'] as const;

export const CHART_STATUSES = ['pending', 'ready', 'error'] as const;

export const READING_TYPES = [
  'natal_overview',
  'personality',
  'love',
  'career',
  'strengths',
] as const;

export const READING_STATUSES = ['pending', 'generating', 'ready', 'error'] as const;

export const FOLLOW_UP_ROLES = ['user', 'assistant', 'system'] as const;

export const TONE_STYLES = ['balanced', 'mystical', 'therapeutic', 'analytical'] as const;
