/**
 * Tests for credits/service.
 * Supabase admin client is mocked so no real DB connection is needed.
 */

// ── mock supabase admin ────────────────────────────────────────────────────

const mockMaybeSingle = jest.fn();

function makeQueryMock(resolvedData: unknown) {
  mockMaybeSingle.mockResolvedValue({ data: resolvedData, error: null });

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
  };
}

function makeOrderedQueryMock(resolvedData: unknown) {
  mockMaybeSingle.mockResolvedValue({ data: resolvedData, error: null });

  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
  };
}

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Pricing module depends on supabaseAdmin too; stub getFreeProducts to return
// empty set so hasForecastAccess/activateForecastAccess tests are self-contained.
jest.mock('@/lib/credits/pricing', () => ({
  getFreeProducts: jest.fn().mockResolvedValue(new Set()),
  getProductPricing: jest.fn().mockResolvedValue({ cost: 2, isFree: false }),
  invalidatePricingCache: jest.fn(),
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getBalance,
  addCredits,
  deductCredits,
  refundCredits,
  refundReferenceDebitIfEligible,
  hasForecastAccess,
  activateForecastAccess,
  chargeForProduct,
} from '@/lib/credits/service';
import { InsufficientCreditsError } from '@/lib/errors';
import { getProductPricing } from '@/lib/credits/pricing';

const mockFrom = supabaseAdmin.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (supabaseAdmin.rpc as jest.Mock).mockReset();
});

// ── getBalance ─────────────────────────────────────────────────────────────

describe('getBalance', () => {
  it('returns balance and forecastAccessUntil from DB', async () => {
    const expiry = '2026-05-23T00:00:00Z';
    mockFrom.mockReturnValue(makeQueryMock({ balance: 7, forecast_access_until: expiry }));

    const result = await getBalance('user-1');

    expect(result.balance).toBe(7);
    expect(result.forecastAccessUntil).toEqual(new Date(expiry));
    expect(mockFrom).toHaveBeenCalledWith('user_credits');
  });

  it('returns 0 balance when no row exists', async () => {
    mockFrom.mockReturnValue(makeQueryMock(null));

    const result = await getBalance('user-new');

    expect(result.balance).toBe(0);
    expect(result.forecastAccessUntil).toBeNull();
  });

  it('returns null forecastAccessUntil when field is null', async () => {
    mockFrom.mockReturnValue(makeQueryMock({ balance: 3, forecast_access_until: null }));

    const result = await getBalance('user-2');

    expect(result.balance).toBe(3);
    expect(result.forecastAccessUntil).toBeNull();
  });
});

// ── addCredits ─────────────────────────────────────────────────────────────

describe('addCredits', () => {
  it('calls add_credits RPC and returns new balance', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 10, transaction_id: 'txn-1' }],
      error: null,
    });

    const result = await addCredits('user-1', 5, 'admin_grant', { note: 'test' });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_credits', {
      p_user_id: 'user-1',
      p_amount: 5,
      p_reason: 'admin_grant',
      p_reference_type: undefined,
      p_reference_id: undefined,
      p_note: 'test',
    });
    expect(result.newBalance).toBe(10);
    expect(result.transactionId).toBe('txn-1');
  });

  it('passes reference fields when provided', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 12, transaction_id: 'txn-2' }],
      error: null,
    });

    await addCredits('user-1', 3, 'pack_purchase', {
      referenceType: 'purchase',
      referenceId: 'purchase-abc',
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'add_credits',
      expect.objectContaining({
        p_reference_type: 'purchase',
        p_reference_id: 'purchase-abc',
      }),
    );
  });

  it('throws on RPC error', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'connection refused', code: 'PGRST000' },
    });

    await expect(addCredits('user-1', 5, 'admin_grant')).rejects.toEqual(
      expect.objectContaining({ message: 'connection refused' }),
    );
  });
});

// ── deductCredits ──────────────────────────────────────────────────────────

describe('deductCredits', () => {
  it('calls deduct_credits_atomic RPC and returns new balance', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 3, transaction_id: 'txn-3' }],
      error: null,
    });

    const result = await deductCredits('user-1', 2, 'reading_debit', {
      referenceType: 'reading',
      referenceId: 'reading-xyz',
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('deduct_credits_atomic', {
      p_user_id: 'user-1',
      p_amount: 2,
      p_reason: 'reading_debit',
      p_reference_type: 'reading',
      p_reference_id: 'reading-xyz',
      p_note: undefined,
    });
    expect(result.newBalance).toBe(3);
    expect(result.transactionId).toBe('txn-3');
  });

  it('throws InsufficientCreditsError when balance is too low', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'INSUFFICIENT_CREDITS:1:2', code: 'P0001' },
    });

    await expect(deductCredits('user-1', 2, 'reading_debit')).rejects.toThrow(
      InsufficientCreditsError,
    );
  });

  it('InsufficientCreditsError includes balance and required amount in context', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'INSUFFICIENT_CREDITS:1:3', code: 'P0001' },
    });

    try {
      await deductCredits('user-1', 3, 'compatibility_debit');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientCreditsError);
      expect((err as InsufficientCreditsError).context.balance).toBe(1);
      expect((err as InsufficientCreditsError).context.required).toBe(3);
    }
  });

  it('re-throws non-insufficient-credits errors as-is', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'connection timeout', code: 'PGRST000' },
    });

    await expect(deductCredits('user-1', 2, 'reading_debit')).rejects.toEqual(
      expect.objectContaining({ message: 'connection timeout' }),
    );
  });
});

// ── refundCredits ──────────────────────────────────────────────────────────

describe('refundCredits', () => {
  it('delegates to addCredits with refund reason', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 5, transaction_id: 'txn-refund' }],
      error: null,
    });

    const result = await refundCredits('user-1', 2, 'refund_llm_failure', {
      referenceType: 'reading',
      referenceId: 'reading-fail',
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'add_credits',
      expect.objectContaining({
        p_reason: 'refund_llm_failure',
        p_reference_type: 'reading',
        p_reference_id: 'reading-fail',
      }),
    );
    expect(result.newBalance).toBe(5);
  });
});

describe('refundReferenceDebitIfEligible', () => {
  it('refunds the exact amount of the matching debit transaction', async () => {
    mockFrom
      .mockReturnValueOnce(makeOrderedQueryMock(null))
      .mockReturnValueOnce(makeOrderedQueryMock({ amount: -3 }));
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 11, transaction_id: 'txn-refund' }],
      error: null,
    });

    const result = await refundReferenceDebitIfEligible(
      'user-1',
      'compatibility_report',
      'report-1',
      'compatibility_debit',
      'refund_llm_failure',
    );

    expect(result).toEqual({ refunded: true, amount: 3, transactionId: 'txn-refund' });
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_credits', {
      p_user_id: 'user-1',
      p_amount: 3,
      p_reason: 'refund_llm_failure',
      p_reference_type: 'compatibility_report',
      p_reference_id: 'report-1',
      p_note: undefined,
    });
  });

  it('skips refund when no matching debit transaction exists', async () => {
    mockFrom
      .mockReturnValueOnce(makeOrderedQueryMock(null))
      .mockReturnValueOnce(makeOrderedQueryMock(null));

    const result = await refundReferenceDebitIfEligible(
      'user-1',
      'reading',
      'reading-1',
      'reading_debit',
      'refund_llm_failure',
    );

    expect(result).toEqual({ refunded: false, amount: 0 });
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('skips duplicate refunds when a refund transaction already exists', async () => {
    mockFrom.mockReturnValueOnce(makeOrderedQueryMock({ id: 'existing-refund' }));

    const result = await refundReferenceDebitIfEligible(
      'user-1',
      'reading',
      'reading-1',
      'reading_debit',
      'refund_llm_failure',
    );

    expect(result).toEqual({ refunded: false, amount: 0 });
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });
});

// ── hasForecastAccess ──────────────────────────────────────────────────────

describe('hasForecastAccess', () => {
  it('returns true when forecastAccessUntil is in the future', async () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    mockFrom.mockReturnValue(makeQueryMock({ balance: 0, forecast_access_until: future }));

    expect(await hasForecastAccess('user-1')).toBe(true);
  });

  it('returns false when forecastAccessUntil is in the past', async () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    mockFrom.mockReturnValue(makeQueryMock({ balance: 0, forecast_access_until: past }));

    expect(await hasForecastAccess('user-1')).toBe(false);
  });

  it('returns false when forecastAccessUntil is null', async () => {
    mockFrom.mockReturnValue(makeQueryMock({ balance: 0, forecast_access_until: null }));

    expect(await hasForecastAccess('user-1')).toBe(false);
  });

  it('returns false when no user_credits row exists', async () => {
    mockFrom.mockReturnValue(makeQueryMock(null));

    expect(await hasForecastAccess('user-new')).toBe(false);
  });
});

// ── activateForecastAccess ─────────────────────────────────────────────────

describe('activateForecastAccess', () => {
  const mockUpdate = jest.fn();

  function setupActivate(currentExpiry: string | null, deductBalance: number) {
    // 1. deductCredits → rpc
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: deductBalance, transaction_id: 'txn-fa' }],
      error: null,
    });

    // 2. getBalance → from('user_credits').select().eq().maybeSingle()
    // 3. update → from('user_credits').update().eq()
    mockUpdate.mockResolvedValue({ error: null });

    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { balance: deductBalance, forecast_access_until: currentExpiry },
        error: null,
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }));
  }

  it('deducts credits and extends access by 1 day from now when no current access', async () => {
    setupActivate(null, 3);

    const before = new Date();
    const result = await activateForecastAccess('user-1', 2);

    // Should be ~1 day from now
    const expectedMin = new Date(before);
    expectedMin.setHours(expectedMin.getHours() + 23);
    const expectedMax = new Date(before);
    expectedMax.setDate(expectedMax.getDate() + 2);

    expect(result.forecastAccessUntil!.getTime()).toBeGreaterThan(expectedMin.getTime());
    expect(result.forecastAccessUntil!.getTime()).toBeLessThan(expectedMax.getTime());
    expect(result.newBalance).toBe(3);

    // Verify deduct was called
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'deduct_credits_atomic',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_amount: 2,
        p_reason: 'forecast_pack_debit',
        p_reference_type: 'forecast',
      }),
    );
  });

  it('extends from current expiry when access is still active', async () => {
    const futureExpiry = new Date();
    futureExpiry.setDate(futureExpiry.getDate() + 10); // 10 days remaining
    setupActivate(futureExpiry.toISOString(), 5);

    const result = await activateForecastAccess('user-1', 2);

    // Should be ~11 days from now (10 remaining + 1 new)
    const expectedMin = new Date();
    expectedMin.setDate(expectedMin.getDate() + 10);
    const expectedMax = new Date();
    expectedMax.setDate(expectedMax.getDate() + 12);

    expect(result.forecastAccessUntil!.getTime()).toBeGreaterThan(expectedMin.getTime());
    expect(result.forecastAccessUntil!.getTime()).toBeLessThan(expectedMax.getTime());
  });

  it('starts from now when current access is expired', async () => {
    const pastExpiry = new Date();
    pastExpiry.setDate(pastExpiry.getDate() - 5); // expired 5 days ago
    setupActivate(pastExpiry.toISOString(), 3);

    const before = new Date();
    const result = await activateForecastAccess('user-1', 2);

    // Should be ~1 day from now (not from expired date)
    const expectedMin = new Date(before);
    expectedMin.setHours(expectedMin.getHours() + 23);

    expect(result.forecastAccessUntil!.getTime()).toBeGreaterThan(expectedMin.getTime());
  });

  it('propagates InsufficientCreditsError from deductCredits', async () => {
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'INSUFFICIENT_CREDITS:0:2', code: 'P0001' },
    });

    await expect(activateForecastAccess('user-1', 2)).rejects.toThrow(InsufficientCreditsError);
  });
});

// ── chargeForProduct ───────────────────────────────────────────────────────

const mockGetProductPricing = getProductPricing as jest.Mock;

describe('chargeForProduct', () => {
  it('skips deduction and returns free=true when product is free', async () => {
    mockGetProductPricing.mockResolvedValue({ cost: 3, isFree: true });
    mockFrom.mockReturnValue(makeQueryMock({ balance: 10, forecast_access_until: null }));

    const result = await chargeForProduct('user-1', 'natal_report');

    expect(result.charged).toBe(false);
    expect(result.free).toBe(true);
    expect(result.newBalance).toBe(10);
    expect(result.transactionId).toBeUndefined();
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
  });

  it('deducts credits when product is paid', async () => {
    mockGetProductPricing.mockResolvedValue({ cost: 2, isFree: false });
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 8, transaction_id: 'txn-charge' }],
      error: null,
    });

    const result = await chargeForProduct('user-1', 'natal_report');

    expect(result.charged).toBe(true);
    expect(result.free).toBe(false);
    expect(result.newBalance).toBe(8);
    expect(result.transactionId).toBe('txn-charge');
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'deduct_credits_atomic',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_amount: 2,
        p_reason: 'reading_debit',
        p_reference_type: 'reading',
      }),
    );
  });

  it('uses correct reason and reference type for each product kind', async () => {
    mockGetProductPricing.mockResolvedValue({ cost: 1, isFree: false });
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 9, transaction_id: 'txn-compat' }],
      error: null,
    });

    await chargeForProduct('user-1', 'compatibility_report');

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'deduct_credits_atomic',
      expect.objectContaining({
        p_reason: 'compatibility_debit',
        p_reference_type: 'compatibility_report',
      }),
    );
  });

  it('throws InsufficientCreditsError when balance is too low', async () => {
    mockGetProductPricing.mockResolvedValue({ cost: 5, isFree: false });
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'INSUFFICIENT_CREDITS:1:5', code: 'P0001' },
    });

    await expect(chargeForProduct('user-1', 'natal_report')).rejects.toThrow(
      InsufficientCreditsError,
    );
  });

  it('passes referenceId when provided', async () => {
    mockGetProductPricing.mockResolvedValue({ cost: 1, isFree: false });
    (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
      data: [{ new_balance: 4, transaction_id: 'txn-chat' }],
      error: null,
    });

    await chargeForProduct('user-1', 'follow_up_pack', { referenceId: 'thread-123' });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      'deduct_credits_atomic',
      expect.objectContaining({
        p_reason: 'chat_pack_debit',
        p_reference_type: 'follow_up',
        p_reference_id: 'thread-123',
      }),
    );
  });
});
