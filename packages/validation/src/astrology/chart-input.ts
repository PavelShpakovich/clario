export const COUNTRY_TIMEZONE_FALLBACK: Record<string, string> = {
  Беларусь: 'Europe/Minsk',
  Belarus: 'Europe/Minsk',
  Россия: 'Europe/Moscow',
  Russia: 'Europe/Moscow',
  Украина: 'Europe/Kyiv',
  Україна: 'Europe/Kyiv',
  Ukraine: 'Europe/Kyiv',
  Казахстан: 'Asia/Almaty',
  Kazakhstan: 'Asia/Almaty',
  Узбекистан: 'Asia/Tashkent',
  Uzbekistan: 'Asia/Tashkent',
  Грузия: 'Asia/Tbilisi',
  Georgia: 'Asia/Tbilisi',
  Армения: 'Asia/Yerevan',
  Armenia: 'Asia/Yerevan',
  Азербайджан: 'Asia/Baku',
  Azerbaijan: 'Asia/Baku',
  Молдова: 'Europe/Chisinau',
  Moldova: 'Europe/Chisinau',
  Литва: 'Europe/Vilnius',
  Lithuania: 'Europe/Vilnius',
  Латвия: 'Europe/Riga',
  Latvia: 'Europe/Riga',
  Эстония: 'Europe/Tallinn',
  Estonia: 'Europe/Tallinn',
  Польша: 'Europe/Warsaw',
  Poland: 'Europe/Warsaw',
  Кыргызстан: 'Asia/Bishkek',
  Kyrgyzstan: 'Asia/Bishkek',
  Таджикистан: 'Asia/Dushanbe',
  Tajikistan: 'Asia/Dushanbe',
  Туркменистан: 'Asia/Ashgabat',
  Turkmenistan: 'Asia/Ashgabat',
};

export function normalizeBirthTime(value?: string | null): string {
  if (!value) return '';

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  return match ? match[1] : trimmed;
}

export function resolveChartTimezone(
  timezone?: string | null,
  country?: string | null,
): string | undefined {
  const normalizedTimezone = timezone?.trim();
  if (normalizedTimezone) return normalizedTimezone;

  const normalizedCountry = country?.trim();
  if (!normalizedCountry) return undefined;

  return COUNTRY_TIMEZONE_FALLBACK[normalizedCountry];
}

export function normalizeCreateChartBirthTime(
  birthTimeKnown: boolean,
  birthTime?: string | null,
): string | undefined {
  const normalized = normalizeBirthTime(birthTime);
  return birthTimeKnown && normalized ? normalized : undefined;
}

export function normalizeUpdateChartBirthTime(
  birthTimeKnown: boolean,
  birthTime?: string | null,
): string | null {
  const normalized = normalizeBirthTime(birthTime);
  return birthTimeKnown && normalized ? normalized : null;
}
