/**
 * Tests for access-utils.
 * Supabase admin client is mocked so no real DB connection is needed.
 */

// ── mock supabase admin ────────────────────────────────────────────────────
const mockMaybeSingle = jest.fn();

// Build a chainable supabase query mock
function makeQueryMock(resolvedData: unknown) {
  mockMaybeSingle.mockResolvedValue({ data: resolvedData, error: null });

  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
  };
  return chain;
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

// ── mock credits service ───────────────────────────────────────────────────
const mockGetBalance = jest.fn();
jest.mock('@/lib/credits/service', () => ({
  getBalance: (...args: unknown[]) => mockGetBalance(...args),
}));

const mockGetCreditCosts = jest.fn();
jest.mock('@/lib/credits/pricing', () => ({
  getCreditCosts: (...args: unknown[]) => mockGetCreditCosts(...args),
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getWorkspaceAccessStatus, getUserUsage, canGenerate } from '@/lib/access-utils';

const mockFrom = supabaseAdmin.from as jest.Mock;

// ── helpers ────────────────────────────────────────────────────────────────

function setupUsageCounterMock(chartsCreated: number | null) {
  mockFrom.mockReturnValue(
    makeQueryMock(chartsCreated != null ? { charts_created: chartsCreated } : null),
  );
}

function setupCreditBalance(balance: number, forecastAccessUntil: Date | null = null) {
  mockGetBalance.mockResolvedValue({ balance, forecastAccessUntil });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupCreditBalance(0);
  mockGetCreditCosts.mockResolvedValue({
    natal_report: 2,
    compatibility_report: 3,
    forecast_report: 2,
    follow_up_pack: 1,
  });
});

// ── getWorkspaceAccessStatus ───────────────────────────────────────────────

describe('getWorkspaceAccessStatus', () => {
  it('returns correct structure when usage counter exists', async () => {
    setupUsageCounterMock(1);
    const status = await getWorkspaceAccessStatus('user-1');

    expect(status.accessMode).toBe('direct');
    expect(status.chartsCreated).toBe(1);
    expect(status.chartsLimit).toBe(3); // from DEFAULT_USAGE_POLICY
    expect(status.chartsRemaining).toBe(2);
    expect(status.canCreateCharts).toBe(true);
    expect(status.hasPaidAccess).toBe(false);
    expect(status.creditBalance).toBe(0);
  });

  it('defaults to 0 charts created when counter row is null', async () => {
    setupUsageCounterMock(null);
    const status = await getWorkspaceAccessStatus('user-new');

    expect(status.chartsCreated).toBe(0);
    expect(status.chartsRemaining).toBe(3);
    expect(status.canCreateCharts).toBe(true);
  });

  it('sets canCreateCharts to false when limit is reached', async () => {
    setupUsageCounterMock(3);
    const status = await getWorkspaceAccessStatus('user-full');

    expect(status.chartsRemaining).toBe(0);
    expect(status.canCreateCharts).toBe(false);
  });

  it('chartsRemaining never goes below zero', async () => {
    setupUsageCounterMock(100); // over limit
    const status = await getWorkspaceAccessStatus('user-over');

    expect(status.chartsRemaining).toBe(0);
  });

  it('usage sub-object mirrors top-level fields', async () => {
    setupUsageCounterMock(2);
    const status = await getWorkspaceAccessStatus('user-2');

    expect(status.usage.chartsCreated).toBe(status.chartsCreated);
    expect(status.usage.chartsLimit).toBe(status.chartsLimit);
    expect(status.usage.chartsRemaining).toBe(status.chartsRemaining);
  });

  it('policy sub-object reflects usage policy', async () => {
    setupUsageCounterMock(0);
    const status = await getWorkspaceAccessStatus('user-policy');

    expect(status.policy.chartsPerPeriod).toBe(3);
    expect(status.policy.savedChartsLimit).toBe(5);
  });

  it('hasPaidAccess is true when credit balance > 0', async () => {
    setupUsageCounterMock(0);
    setupCreditBalance(5);
    const status = await getWorkspaceAccessStatus('user-paid');

    expect(status.hasPaidAccess).toBe(true);
    expect(status.creditBalance).toBe(5);
  });

  it('includes forecastAccessUntil from credit balance', async () => {
    setupUsageCounterMock(0);
    const expiry = new Date('2026-06-01T00:00:00Z');
    setupCreditBalance(3, expiry);
    const status = await getWorkspaceAccessStatus('user-forecast');

    expect(status.forecastAccessUntil).toEqual(expiry);
  });
});

// ── getUserUsage ───────────────────────────────────────────────────────────

describe('getUserUsage', () => {
  it('returns usage with chartsRemaining clamped to zero', async () => {
    setupUsageCounterMock(10);
    const usage = await getUserUsage('user-maxed');

    expect(usage.chartsCreated).toBe(10);
    expect(usage.chartsRemaining).toBe(0);
    expect(usage.chartsLimit).toBe(3);
  });

  it('returns full quota when no usage row exists', async () => {
    setupUsageCounterMock(null);
    const usage = await getUserUsage('user-fresh');

    expect(usage.chartsCreated).toBe(0);
    expect(usage.chartsRemaining).toBe(3);
  });
});

// ── canGenerate ────────────────────────────────────────────────────────────

describe('canGenerate', () => {
  it('returns allowed=true when balance >= cost', async () => {
    setupCreditBalance(5);
    const result = await canGenerate('user-1', 'natal_report');

    expect(result.allowed).toBe(true);
    expect(result.balance).toBe(5);
    expect(result.cost).toBe(2);
  });

  it('returns allowed=false when balance < cost', async () => {
    setupCreditBalance(1);
    const result = await canGenerate('user-1', 'compatibility_report');

    expect(result.allowed).toBe(false);
    expect(result.balance).toBe(1);
    expect(result.cost).toBe(3);
  });

  it('returns allowed=true when balance exactly equals cost', async () => {
    setupCreditBalance(2);
    const result = await canGenerate('user-1', 'natal_report');

    expect(result.allowed).toBe(true);
  });

  it('uses dynamic costs from getCreditCosts', async () => {
    setupCreditBalance(5);
    mockGetCreditCosts.mockResolvedValue({
      natal_report: 10,
      compatibility_report: 3,
      forecast_report: 2,
      follow_up_pack: 1,
    });

    const result = await canGenerate('user-1', 'natal_report');

    expect(result.allowed).toBe(false);
    expect(result.cost).toBe(10);
  });
});
