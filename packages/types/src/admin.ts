export interface AdminAnalytics {
  totalUsers: number;
  newUsersThisMonth: number;
  totalCharts: number;
  chartsThisMonth: number;
  totalReadings: number;
  readingsThisMonth: number;
  totalCompatibilityReports: number;
  totalAiCalls: number;
  aiCallsThisMonth: number;
  aiErrors: number;
  totalFollowUpMessages: number;
  totalTokensUsed: number;
  totalCreditsSpent: number;
  readingsByType: Record<string, number>;
}
