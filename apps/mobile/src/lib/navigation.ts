import { router } from 'expo-router';

/**
 * Navigate back reliably in Expo Router.
 *
 * Some routes can still be opened without stack history, for example when a
 * screen is reached via replace/reset semantics or from hidden tab surfaces
 * like store/calendar. This helper falls back to a known parent route when
 * there's nothing to go back to.
 */
export function goBack(fallback: string): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as never);
  }
}

export function resolveParentRoute(
  returnTo: string | string[] | undefined,
  fallback: string,
): string {
  return typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : fallback;
}

export function goBackTo(returnTo: string | string[] | undefined, fallback: string): void {
  goBack(resolveParentRoute(returnTo, fallback));
}

export function withReturnTo(pathname: string, returnTo: string): string {
  return `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;
}
