export const COMPATIBILITY_TYPES = ['romantic', 'friendship', 'business', 'family'] as const;
export type CompatibilityType = (typeof COMPATIBILITY_TYPES)[number];
