/**
 * Tests for credit-related API routes.
 * Verifies auth gates, validation, credit operations, and error responses.
 *
 * `withApiHandler` is mocked to a passthrough so we test route logic directly
 * without pulling in next/server runtime internals.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/api/handler', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withApiHandler: (fn: (...args: any[]) => any) => fn,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => {
      const status = (init as Record<string, unknown>)?.status ?? 200;
      return {
        status,
        json: async () => body,
        headers: new Headers(),
      };
    },
  },
}));

jest.mock('@/lib/api/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'test@example.com', isAdmin: false },
  }),
  requireAdmin: jest.fn().mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@example.com', isAdmin: true },
  }),
}));

jest.mock('@/lib/credits/service', () => ({
  getBalance: jest.fn(),
  addCredits: jest.fn(),
  deductCredits: jest.fn(),
  activateForecastAccess: jest.fn(),
  hasForecastAccess: jest.fn(),
}));

jest.mock('@/lib/credits/pricing', () => ({
  getCreditCosts: jest.fn().mockResolvedValue({
    natal_report: 2,
    compatibility_report: 3,
    forecast_report: 2,
    follow_up_pack: 1,
  }),
  getFreeProducts: jest.fn().mockResolvedValue(new Set()),
  getCreditPacks: jest.fn().mockResolvedValue([]),
  getAllCreditPacks: jest.fn().mockResolvedValue([]),
  invalidatePricingCache: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

import {
  getBalance,
  addCredits,
  deductCredits,
  activateForecastAccess,
} from '@/lib/credits/service';
import { InsufficientCreditsError } from '@/lib/errors';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(url: string, init?: { method?: string }): Partial<Request> {
  return {
    url: `http://localhost${url}`,
    method: init?.method ?? 'GET',
    json: async () => ({}),
  };
}

function jsonRequest(url: string, body: unknown): Partial<Request> {
  return {
    url: `http://localhost${url}`,
    method: 'POST',
    json: async () => body,
  };
}

// ── GET /api/credits/balance ───────────────────────────────────────────────

describe('GET /api/credits/balance', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/credits/balance/route');
    handler = mod.GET;
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns balance and forecastAccessUntil', async () => {
    (getBalance as jest.Mock).mockResolvedValue({
      balance: 7,
      forecastAccessUntil: new Date('2026-06-01T00:00:00Z'),
    });

    const res = await handler(makeRequest('/api/credits/balance'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.balance).toBe(7);
    expect(body.forecastAccessUntil).toBe('2026-06-01T00:00:00.000Z');
  });
});

// ── GET /api/credits/pricing ───────────────────────────────────────────────

describe('GET /api/credits/pricing', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/credits/pricing/route');
    handler = mod.GET;
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns credit costs map', async () => {
    const res = await handler(makeRequest('/api/credits/pricing'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.costs).toEqual({
      natal_report: 2,
      compatibility_report: 3,
      forecast_report: 2,
      follow_up_pack: 1,
    });
  });
});

// ── POST /api/forecasts/access ─────────────────────────────────────────────

describe('POST /api/forecasts/access', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/forecasts/access/route');
    handler = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  it('activates forecast access and returns new expiry', async () => {
    const expiry = new Date('2026-06-01T00:00:00Z');
    (activateForecastAccess as jest.Mock).mockResolvedValue({
      forecastAccessUntil: expiry,
      newBalance: 5,
    });

    const res = await handler(makeRequest('/api/forecasts/access', { method: 'POST' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.forecastAccessUntil).toBe('2026-06-01T00:00:00.000Z');
    expect(body.newBalance).toBe(5);
    expect(activateForecastAccess).toHaveBeenCalledWith('user-123', 2);
  });

  it('returns 402 on insufficient credits', async () => {
    (activateForecastAccess as jest.Mock).mockRejectedValue(
      new InsufficientCreditsError({
        message: 'Not enough',
        context: { userId: 'user-123', balance: 0, required: 2 },
      }),
    );

    const res = await handler(makeRequest('/api/forecasts/access', { method: 'POST' }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('insufficient_credits');
    expect(body.required).toBe(2);
    expect(body.balance).toBe(0);
  });
});

// ── POST /api/admin/credits/grant ──────────────────────────────────────────

describe('POST /api/admin/credits/grant', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/credits/grant/route');
    handler = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  it('grants credits to a user', async () => {
    (addCredits as jest.Mock).mockResolvedValue({
      newBalance: 15,
      transactionId: 'txn-grant',
    });

    const res = await handler(
      jsonRequest('/api/admin/credits/grant', {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 10,
        note: 'Welcome bonus',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.newBalance).toBe(15);
    expect(addCredits).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      10,
      'admin_grant',
      { note: 'Welcome bonus' },
    );
  });

  it('rejects invalid amount (negative)', async () => {
    const res = await handler(
      jsonRequest('/api/admin/credits/grant', {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: -5,
      }),
    );

    expect(res.status).toBe(422);
    expect(addCredits).not.toHaveBeenCalled();
  });

  it('rejects non-UUID userId', async () => {
    const res = await handler(
      jsonRequest('/api/admin/credits/grant', {
        userId: 'not-a-uuid',
        amount: 5,
      }),
    );

    expect(res.status).toBe(422);
    expect(addCredits).not.toHaveBeenCalled();
  });

  it('rejects amount over 1000', async () => {
    const res = await handler(
      jsonRequest('/api/admin/credits/grant', {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1001,
      }),
    );

    expect(res.status).toBe(422);
  });
});

// ── POST /api/admin/credits/revoke ─────────────────────────────────────────

describe('POST /api/admin/credits/revoke', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/admin/credits/revoke/route');
    handler = mod.POST;
  });

  beforeEach(() => jest.clearAllMocks());

  it('revokes credits from a user', async () => {
    (deductCredits as jest.Mock).mockResolvedValue({
      newBalance: 3,
      transactionId: 'txn-revoke',
    });

    const res = await handler(
      jsonRequest('/api/admin/credits/revoke', {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5,
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.newBalance).toBe(3);
    expect(deductCredits).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      5,
      'admin_revoke',
      { note: undefined },
    );
  });

  it('returns 422 on insufficient credits', async () => {
    (deductCredits as jest.Mock).mockRejectedValue(
      new InsufficientCreditsError({
        message: 'Not enough',
        context: { userId: 'u', balance: 2, required: 5 },
      }),
    );

    const res = await handler(
      jsonRequest('/api/admin/credits/revoke', {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5,
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toBe('insufficient_credits');
    expect(body.balance).toBe(2);
  });

  it('rejects invalid input', async () => {
    const res = await handler(
      jsonRequest('/api/admin/credits/revoke', { userId: 'bad', amount: 0 }),
    );

    expect(res.status).toBe(422);
    expect(deductCredits).not.toHaveBeenCalled();
  });
});
