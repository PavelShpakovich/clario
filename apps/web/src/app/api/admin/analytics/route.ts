import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { AdminAnalytics } from '@clario/types';

export type { AdminAnalytics };

const db = supabaseAdmin;

const FALLBACK: AdminAnalytics = {
  totalUsers: 0,
  newUsersThisMonth: 0,
  totalCharts: 0,
  chartsThisMonth: 0,
  totalReadings: 0,
  readingsThisMonth: 0,
  totalCompatibilityReports: 0,
  totalAiCalls: 0,
  aiCallsThisMonth: 0,
  aiErrors: 0,
  totalFollowUpMessages: 0,
  totalTokensUsed: 0,
  totalCreditsSpent: 0,
  readingsByType: {},
};

/**
 * GET /api/admin/analytics
 *
 * Returns aggregated platform metrics for the astrology workspace.
 * Admin-only.
 */
export const GET = withApiHandler(async () => {
  await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let results: Awaited<ReturnType<typeof runQueries>> | null = null;

  try {
    results = await runQueries(monthStart);
  } catch (err) {
    // Network-level failure — log and return zeros rather than 500.
    logger.error({ err }, 'Analytics queries failed with unexpected throw');
    return NextResponse.json(FALLBACK);
  }

  const {
    totalUsersRes,
    newUsersRes,
    totalChartsRes,
    totalReadingsRes,
    compatRes,
    totalAiRes,
    aiThisMonthRes,
    aiErrorsRes,
    followUpCountRes,
    followUpTokensRes,
    generationTokensRes,
    usageCountersRes,
    readingTypesRes,
    creditsSpentRes,
  } = results;

  const supabaseErrors = [
    totalUsersRes.error,
    newUsersRes.error,
    totalChartsRes.error,
    totalReadingsRes.error,
    compatRes.error,
    totalAiRes.error,
    aiThisMonthRes.error,
    aiErrorsRes.error,
    followUpCountRes.error,
    followUpTokensRes.error,
    generationTokensRes.error,
    usageCountersRes.error,
    readingTypesRes.error,
    creditsSpentRes.error,
  ].filter(Boolean);
  if (supabaseErrors.length > 0) {
    logger.warn({ supabaseErrors }, 'Some analytics queries returned errors');
  }

  const followUpTokensUsed = (followUpTokensRes.data ?? []).reduce(
    (sum: number, row: { usage_tokens: number | null }) => sum + (row.usage_tokens ?? 0),
    0,
  );
  const generationTokensUsed = (generationTokensRes.data ?? []).reduce(
    (sum: number, row: { usage_tokens: number | null }) => sum + (row.usage_tokens ?? 0),
    0,
  );
  const totalTokensUsed = followUpTokensUsed + generationTokensUsed;

  const totalCreditsSpent = (creditsSpentRes.data ?? []).reduce(
    (sum: number, row: { amount: number | null }) => sum + Math.abs(row.amount ?? 0),
    0,
  );

  const usageRows = usageCountersRes.data ?? [];
  const chartsThisMonth = usageRows.reduce(
    (sum: number, row: { charts_created: number | null }) => sum + (row.charts_created ?? 0),
    0,
  );
  const readingsThisMonth = usageRows.reduce(
    (sum: number, row: { readings_generated: number | null }) =>
      sum + (row.readings_generated ?? 0),
    0,
  );

  const readingsByType: Record<string, number> = {};
  for (const row of readingTypesRes.data ?? []) {
    const type = (row.reading_type as string) ?? 'unknown';
    readingsByType[type] = (readingsByType[type] ?? 0) + 1;
  }

  const analytics: AdminAnalytics = {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersThisMonth: newUsersRes.count ?? 0,
    totalCharts: totalChartsRes.count ?? 0,
    chartsThisMonth,
    totalReadings: totalReadingsRes.count ?? 0,
    readingsThisMonth,
    totalCompatibilityReports: compatRes.count ?? 0,
    totalAiCalls: totalAiRes.count ?? 0,
    aiCallsThisMonth: aiThisMonthRes.count ?? 0,
    aiErrors: aiErrorsRes.count ?? 0,
    totalFollowUpMessages: followUpCountRes.count ?? 0,
    totalTokensUsed,
    totalCreditsSpent,
    readingsByType,
  };

  return NextResponse.json(analytics);
});

async function runQueries(monthStart: string) {
  const [
    totalUsersRes,
    newUsersRes,
    totalChartsRes,
    totalReadingsRes,
    compatRes,
    totalAiRes,
    aiThisMonthRes,
    aiErrorsRes,
    followUpCountRes,
    followUpTokensRes,
    generationTokensRes,
    usageCountersRes,
    readingTypesRes,
    creditsSpentRes,
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    db.from('charts').select('*', { count: 'exact', head: true }),
    db.from('readings').select('*', { count: 'exact', head: true }),
    db.from('compatibility_reports').select('*', { count: 'exact', head: true }),
    db.from('generation_logs').select('*', { count: 'exact', head: true }),
    db
      .from('generation_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart),
    db
      .from('generation_logs')
      .select('*', { count: 'exact', head: true })
      .not('error_message', 'is', null),
    // HEAD-only count — no data rows fetched
    db.from('follow_up_messages').select('*', { count: 'exact', head: true }),
    // Only fetch rows where usage_tokens is tracked (non-null) to compute sum
    db.from('follow_up_messages').select('usage_tokens').not('usage_tokens', 'is', null),
    db.from('generation_logs').select('usage_tokens').not('usage_tokens', 'is', null),
    db
      .from('usage_counters')
      .select('readings_generated, charts_created')
      .gte('period_start', monthStart),
    db.from('readings').select('reading_type'),
    // Sum of all debits (negative amounts) in credit_transactions
    db.from('credit_transactions').select('amount').lt('amount', 0),
  ]);

  return {
    totalUsersRes,
    newUsersRes,
    totalChartsRes,
    totalReadingsRes,
    compatRes,
    totalAiRes,
    aiThisMonthRes,
    aiErrorsRes,
    followUpCountRes,
    followUpTokensRes,
    generationTokensRes,
    usageCountersRes,
    readingTypesRes,
    creditsSpentRes,
  };
}
