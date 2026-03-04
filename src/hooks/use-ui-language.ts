'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { locales } from '@/i18n/config';
import { profileApi } from '@/services/profile-api';

type Locale = (typeof locales)[number];

export function useUiLanguage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load initial locale from cookie
  useEffect(() => {
    const getInitialLocale = () => {
      const cookie = document.cookie.split('; ').find((row) => row.startsWith('NEXT_LOCALE='));
      const saved = cookie?.split('=')[1] as Locale | undefined;
      return (locales as readonly string[]).includes(saved || '') ? saved! : 'en';
    };

    setLocale(getInitialLocale());
    setIsLoading(false);
  }, []);

  const setLanguage = async (newLocale: Locale) => {
    try {
      setIsLoading(true);

      // Update cookie
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;

      // Update database preference if user is authenticated
      await profileApi.updateUiLanguage(newLocale);

      setLocale(newLocale);

      // Refresh to apply new locale
      router.refresh();
    } catch (error) {
      console.error('Failed to set language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    locale,
    setLanguage,
    isLoading,
  };
}
