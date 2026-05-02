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
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, resetAt: Date.now() + 60_000 }),
}));

jest.mock('@/lib/readings/service', () => ({
  createPendingReading: jest.fn(),
}));

jest.mock('@/lib/compatibility/service', () => ({
  COMPATIBILITY_TYPES: ['romantic', 'friendship', 'business', 'family'] as const,
  createPendingCompatibility: jest.fn(),
}));

jest.mock('@/lib/credits/service', () => ({
  chargeForProduct: jest.fn(),
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
}));

jest.mock('@/lib/forecasts/service', () => ({
  clearDailyForecastContent: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { InsufficientCreditsError } from '@/lib/errors';
import { createPendingReading } from '@/lib/readings/service';
import { createPendingCompatibility } from '@/lib/compatibility/service';
import { chargeForProduct, activateForecastAccess, hasForecastAccess } from '@/lib/credits/service';
import { clearDailyForecastContent } from '@/lib/forecasts/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const mockFrom = supabaseAdmin.from as jest.Mock;

function jsonRequest(body: unknown): Partial<Request> {
  return {
    method: 'POST',
    json: async () => body,
  };
}

function routeParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

function makeDeleteQuery() {
  return {
    eq: jest.fn().mockReturnThis(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/readings', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/readings/route');
    handler = mod.POST;
  });

  it('creates a reading and charges by reading reference id', async () => {
    (createPendingReading as jest.Mock).mockResolvedValue({ id: 'reading-1' });
    (chargeForProduct as jest.Mock).mockResolvedValue({ newBalance: 8, free: false });

    const res = await handler(
      jsonRequest({
        chartId: '550e8400-e29b-41d4-a716-446655440000',
        readingType: 'natal_overview',
        locale: 'ru',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.reading).toEqual({ id: 'reading-1' });
    expect(chargeForProduct).toHaveBeenCalledWith('user-123', 'natal_report', {
      referenceId: 'reading-1',
    });
  });

  it('deletes the pending reading and returns 402 when charge fails', async () => {
    const deleteQuery = makeDeleteQuery();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') {
        return {
          delete: jest.fn().mockReturnValue(deleteQuery),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    (createPendingReading as jest.Mock).mockResolvedValue({ id: 'reading-2' });
    (chargeForProduct as jest.Mock).mockRejectedValue(
      new InsufficientCreditsError({
        message: 'Not enough credits',
        context: { balance: 0, required: 2 },
      }),
    );

    const res = await handler(
      jsonRequest({
        chartId: '550e8400-e29b-41d4-a716-446655440000',
        readingType: 'natal_overview',
        locale: 'ru',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body).toEqual({ error: 'insufficient_credits', required: 2, balance: 0 });
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'reading-2');
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-123');
  });

  it('skips charging when replacing a failed reading', async () => {
    const deleteQuery = makeDeleteQuery();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') {
        return {
          delete: jest.fn().mockReturnValue(deleteQuery),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    (createPendingReading as jest.Mock).mockResolvedValue({ id: 'reading-3' });

    const res = await handler(
      jsonRequest({
        chartId: '550e8400-e29b-41d4-a716-446655440000',
        readingType: 'natal_overview',
        locale: 'ru',
        replaceReadingId: '550e8400-e29b-41d4-a716-446655440111',
      }),
    );

    expect(res.status).toBe(201);
    expect(chargeForProduct).not.toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(1, 'id', '550e8400-e29b-41d4-a716-446655440111');
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-123');
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(3, 'status', 'error');
  });
});

describe('POST /api/compatibility', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/compatibility/route');
    handler = mod.POST;
  });

  it('creates a family compatibility report and charges by report id', async () => {
    (createPendingCompatibility as jest.Mock).mockResolvedValue({ id: 'report-1' });
    (chargeForProduct as jest.Mock).mockResolvedValue({ newBalance: 5, free: false });

    const res = await handler(
      jsonRequest({
        primaryChartId: '550e8400-e29b-41d4-a716-446655440000',
        secondaryChartId: '550e8400-e29b-41d4-a716-446655440001',
        compatibilityType: 'family',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.report).toEqual({ id: 'report-1' });
    expect(chargeForProduct).toHaveBeenCalledWith('user-123', 'compatibility_report', {
      referenceId: 'report-1',
    });
  });

  it('deletes the pending compatibility report and returns 402 when charge fails', async () => {
    const deleteQuery = makeDeleteQuery();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'compatibility_reports') {
        return {
          delete: jest.fn().mockReturnValue(deleteQuery),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    (createPendingCompatibility as jest.Mock).mockResolvedValue({ id: 'report-2' });
    (chargeForProduct as jest.Mock).mockRejectedValue(
      new InsufficientCreditsError({
        message: 'Not enough credits',
        context: { balance: 1, required: 3 },
      }),
    );

    const res = await handler(
      jsonRequest({
        primaryChartId: '550e8400-e29b-41d4-a716-446655440000',
        secondaryChartId: '550e8400-e29b-41d4-a716-446655440001',
        compatibilityType: 'business',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body).toEqual({ error: 'insufficient_credits', required: 3, balance: 1 });
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'report-2');
    expect(deleteQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-123');
  });
});

describe('POST /api/chat/[readingId]/unlock', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any, ctx: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/chat/[readingId]/unlock/route');
    handler = mod.POST;
  });

  it('charges follow-up credits by thread id and increases the message limit', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { message_limit: 15 },
      error: null,
    });
    const selectAfterUpdate = jest.fn().mockReturnValue({ maybeSingle });
    const secondEq = jest.fn().mockReturnValue({ select: selectAfterUpdate });
    const firstEq = jest.fn().mockReturnValue({ eq: secondEq });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'reading-1', chart_id: 'chart-1', title: 'Reading title' },
            error: null,
          }),
        };
      }

      if (table === 'follow_up_threads') {
        return {
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'thread-1', message_limit: 10 },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: firstEq,
          }),
          select: jest.fn(),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    (chargeForProduct as jest.Mock).mockResolvedValue({ newBalance: 4, free: false });

    const res = await handler(
      { method: 'POST' },
      routeParams({ readingId: '550e8400-e29b-41d4-a716-446655440000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ messagesLimit: 15, addedMessages: 5, newBalance: 4 });
    expect(chargeForProduct).toHaveBeenCalledWith('user-123', 'follow_up_pack', {
      referenceId: 'thread-1',
    });
    expect(firstEq).toHaveBeenCalledWith('id', 'thread-1');
    expect(secondEq).toHaveBeenCalledWith('message_limit', 10);
  });

  it('returns 402 and does not update the thread when follow-up credits are insufficient', async () => {
    const firstEq = jest.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'reading-1', chart_id: 'chart-1', title: 'Reading title' },
            error: null,
          }),
        };
      }

      if (table === 'follow_up_threads') {
        return {
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'thread-2', message_limit: 5 },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: firstEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    (chargeForProduct as jest.Mock).mockRejectedValue(
      new InsufficientCreditsError({
        message: 'Not enough credits',
        context: { balance: 0, required: 1 },
      }),
    );

    const res = await handler(
      { method: 'POST' },
      routeParams({ readingId: '550e8400-e29b-41d4-a716-446655440000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body).toEqual({ error: 'insufficient_credits', required: 1, balance: 0 });
    expect(firstEq).not.toHaveBeenCalled();
  });

  it('retries the thread update when a concurrent unlock changes the current limit', async () => {
    const updatedMaybeSingle = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { message_limit: 20 }, error: null });
    const selectAfterUpdate = jest.fn().mockReturnValue({ maybeSingle: updatedMaybeSingle });
    const updateEqSecond = jest.fn().mockReturnValue({ select: selectAfterUpdate });
    const updateEqFirst = jest.fn().mockReturnValue({ eq: updateEqSecond });

    const latestMaybeSingle = jest
      .fn()
      .mockResolvedValue({ data: { message_limit: 15 }, error: null });
    const latestEq = jest.fn().mockReturnValue({ maybeSingle: latestMaybeSingle });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'reading-1', chart_id: 'chart-1', title: 'Reading title' },
            error: null,
          }),
        };
      }

      if (table === 'follow_up_threads') {
        return {
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'thread-1', message_limit: 10 },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: updateEqFirst,
          }),
          select: jest.fn().mockReturnValue({
            eq: latestEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    (chargeForProduct as jest.Mock).mockResolvedValue({ newBalance: 4, free: false });

    const res = await handler(
      { method: 'POST' },
      routeParams({ readingId: '550e8400-e29b-41d4-a716-446655440000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ messagesLimit: 20, addedMessages: 5, newBalance: 4 });
    expect(updateEqSecond).toHaveBeenNthCalledWith(1, 'message_limit', 10);
    expect(latestEq).toHaveBeenCalledWith('id', 'thread-1');
    expect(updateEqSecond).toHaveBeenNthCalledWith(2, 'message_limit', 15);
  });
});

describe('POST /api/forecasts/access', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/forecasts/access/route');
    handler = mod.POST;
  });

  it('returns the free flag for horoscope access purchases', async () => {
    (activateForecastAccess as jest.Mock).mockResolvedValue({
      forecastAccessUntil: null,
      newBalance: 7,
      free: true,
    });

    const res = await handler({ method: 'POST' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      forecastAccessUntil: null,
      newBalance: 7,
      free: true,
    });
  });
});

describe('POST /api/forecasts/[forecastId]/regenerate', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any, ctx: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/forecasts/[forecastId]/regenerate/route');
    handler = mod.POST;
  });

  it('blocks regeneration when horoscope access is missing', async () => {
    (hasForecastAccess as jest.Mock).mockResolvedValue(false);

    const res = await handler(
      { method: 'POST' },
      routeParams({ forecastId: '550e8400-e29b-41d4-a716-446655440000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'forecast_access_required' });
    expect(chargeForProduct).not.toHaveBeenCalled();
  });

  it('charges regeneration credits and clears cached horoscope content', async () => {
    (hasForecastAccess as jest.Mock).mockResolvedValue(true);
    (chargeForProduct as jest.Mock).mockResolvedValue({ newBalance: 6, free: false });

    const res = await handler(
      { method: 'POST' },
      routeParams({ forecastId: '550e8400-e29b-41d4-a716-446655440000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, newBalance: 6, free: false });
    expect(chargeForProduct).toHaveBeenCalledWith('user-123', 'forecast_report');
    expect(clearDailyForecastContent).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-123',
    );
  });

  it('returns 402 and does not clear content when regeneration credits are insufficient', async () => {
    (hasForecastAccess as jest.Mock).mockResolvedValue(true);
    (chargeForProduct as jest.Mock).mockRejectedValue(
      new InsufficientCreditsError({
        message: 'Not enough credits',
        context: { balance: 1, required: 2 },
      }),
    );

    const res = await handler(
      { method: 'POST' },
      routeParams({ forecastId: '550e8400-e29b-41d4-a716-446655440000' }),
    );
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body).toEqual({ error: 'insufficient_credits', required: 2, balance: 1 });
    expect(clearDailyForecastContent).not.toHaveBeenCalled();
  });
});
