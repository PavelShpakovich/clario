export const locales = ['ru'] as const;
export const defaultLocale = 'ru' as const;

export type Locale = (typeof locales)[number];
