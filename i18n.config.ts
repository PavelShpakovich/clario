import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './src/i18n/config';

export default getRequestConfig(async () => {
  const locale = defaultLocale;

  // Placeholder - will be replaced in Phase 2 with user preference lookup
  // For now, always use default locale

  // Ensure locale is valid
  const validLocale = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;

  // Import messages for the current locale
  const messages = (await import(`./src/i18n/messages/${validLocale}.json`)).default;

  return {
    locale: validLocale,
    messages,
  };
});
