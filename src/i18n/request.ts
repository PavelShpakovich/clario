import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async () => {
  let locale = defaultLocale;

  // Try to get locale from cookies (user preference or guest preference)
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  if (localeCookie && (locales as readonly string[]).includes(localeCookie)) {
    locale = localeCookie as typeof defaultLocale;
  } else {
    // Fallback to default
    locale = defaultLocale;
  }

  // Ensure locale is valid
  const validLocale = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;

  // Import messages for the current locale
  const messages = (await import(`./messages/${validLocale}.json`)).default;

  return {
    locale: validLocale,
    messages,
  };
});
