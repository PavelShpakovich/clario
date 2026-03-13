/**
 * Feature flags — code-based toggles for enabling/disabling features.
 */
function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export const FLAGS = {
  subscriptionsEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS, false),
  webpayEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_WEBPAY, false),
  paidInfoVisible: parseBooleanFlag(process.env.NEXT_PUBLIC_SHOW_PAID_INFO, false),
} as const;

export function areSubscriptionsEnabled(): boolean {
  return FLAGS.subscriptionsEnabled;
}

export function isWebpayEnabled(): boolean {
  return FLAGS.webpayEnabled;
}

export function isPaidInformationVisible(): boolean {
  return FLAGS.paidInfoVisible;
}

export function getEffectivePlanId<TPlanId extends string>(
  planId: TPlanId,
  fallback: TPlanId,
): TPlanId {
  return areSubscriptionsEnabled() ? planId : fallback;
}
