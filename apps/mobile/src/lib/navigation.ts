import { router } from 'expo-router';

/**
 * Navigate back reliably in Expo Router.
 *
 * Hidden tab screens (admin, store, horoscope, calendar) are tab-switches,
 * not stack pushes, so `router.back()` has no history and falls to the
 * default (index) tab. This helper falls back to a known parent route
 * when there's nothing to go back to.
 */
export function goBack(fallback: string): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as never);
  }
}
