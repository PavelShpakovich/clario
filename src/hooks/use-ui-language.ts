'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n/config';
import { useLocaleSwitch } from '@/components/root-providers';

type Locale = (typeof locales)[number];

const PUBLIC_PAGE_BASES = ['/', '/privacy', '/terms'];

export function useUiLanguage() {
  // Read locale from NextIntlClientProvider context — the single source of truth.
  // This stays in sync whether the locale was set by the URL segment or by switchLocale.
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const { switchLocale } = useLocaleSwitch();

  const setLanguage = async (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;

    const stripped = pathname.replace(/^\/ru\b/, '') || '/';
    const isPublicPage = PUBLIC_PAGE_BASES.includes(stripped);

    if (isPublicPage) {
      // Hard navigation bypasses the App Router client-side route cache, which
      // would otherwise serve a stale RSC payload for a previously visited URL,
      // causing only client components (Header) to update while the
      // server-rendered page content stays in the old locale.
      const newPath = newLocale === 'ru' ? `/ru${stripped === '/' ? '' : stripped}` : stripped;
      window.location.href = newPath || '/';
    } else {
      // Soft update for authenticated pages — swap messages in the provider
      // without a full page reload.
      await switchLocale(newLocale);
    }
  };

  return {
    locale,
    setLanguage,
    isLoading: false,
  };
}
