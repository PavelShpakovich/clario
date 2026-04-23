export interface UsagePolicy {
  chartsPerPeriod: number;
  savedChartsLimit: number | null;
}

const DEFAULT_USAGE_POLICY: UsagePolicy = {
  chartsPerPeriod: 3,
  savedChartsLimit: 5,
};

export async function getUsagePolicy(): Promise<UsagePolicy> {
  return DEFAULT_USAGE_POLICY;
}

// ─── Credit cost defaults (fallback when DB is unavailable) ─────────────────

export const DEFAULT_READING_CREDIT_COST = 2;
export const DEFAULT_COMPATIBILITY_CREDIT_COST = 3;
export const DEFAULT_FORECAST_PACK_CREDIT_COST = 2;
export const DEFAULT_CHAT_PACK_CREDIT_COST = 1;

// Credits granted to every new user upon registration
export const INITIAL_CREDIT_GRANT = 5;
