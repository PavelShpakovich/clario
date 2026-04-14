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
