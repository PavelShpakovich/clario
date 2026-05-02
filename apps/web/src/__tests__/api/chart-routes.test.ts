jest.mock('@/lib/api/handler', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withApiHandler: (fn: (...args: any[]) => any) => fn,
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123' },
  }),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({
    allowed: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  }),
  rateLimitHeaders: jest.fn().mockReturnValue({ 'X-RateLimit-Remaining': '9' }),
}));

jest.mock('@/lib/astrology/chart-service', () => ({
  createChart: jest.fn(),
  recalculateChart: jest.fn(),
}));

jest.mock('@/lib/forecasts/service', () => ({
  clearDailyForecastsForChart: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { createChart, recalculateChart } from '@/lib/astrology/chart-service';
import { clearDailyForecastsForChart } from '@/lib/forecasts/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const CHART_ID = '123e4567-e89b-12d3-a456-426614174000';

function makeJsonRequest(url: string, method: string, body: unknown): Partial<Request> {
  return {
    url: `http://localhost${url}`,
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

function createSelectChain(result: unknown) {
  const chain = {
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: result }),
  };

  return {
    select: jest.fn().mockReturnValue(chain),
  };
}

function createUpdateChain(result: unknown) {
  const chain = {
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: result, error: null }),
  };

  return {
    update: jest.fn().mockReturnValue(chain),
  };
}

describe('chart routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/charts', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/charts/route');
      handler = mod.POST;
    });

    it('normalizes birth time and applies country timezone fallback before create', async () => {
      (createChart as jest.Mock).mockResolvedValue({
        chart: { id: CHART_ID },
        snapshot: { id: 'snapshot-1', snapshot_version: 1 },
      });

      const res = await handler(
        makeJsonRequest('/api/charts', 'POST', {
          label: 'Natal Chart',
          personName: 'Jane Doe',
          subjectType: 'self',
          birthDate: '1990-06-21',
          birthTime: '14:30:45',
          birthTimeKnown: true,
          city: 'Минск',
          country: 'Беларусь',
          latitude: 53.9045,
          longitude: 27.5615,
          houseSystem: 'placidus',
          locale: 'ru',
        }),
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(createChart).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          birthTime: '14:30',
          timezone: 'Europe/Minsk',
        }),
      );
      expect(body).toEqual({
        chart: { id: CHART_ID },
        snapshot: { id: 'snapshot-1', snapshot_version: 1 },
      });
    });
  });

  describe('PATCH /api/charts/[chartId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    const existingChart = {
      id: CHART_ID,
      user_id: 'user-123',
      label: 'Natal Chart',
      person_name: 'Jane Doe',
      subject_type: 'self',
      birth_date: '1990-06-21',
      birth_time: '14:30',
      birth_time_known: true,
      city: 'Минск',
      country: 'Беларусь',
      timezone: 'Europe/Minsk',
      latitude: 53.9045,
      longitude: 27.5615,
      house_system: 'placidus',
      notes: null,
    };

    beforeAll(async () => {
      const mod = await import('@/app/api/charts/[chartId]/route');
      handler = mod.PATCH;
    });

    it('recalculates the natal chart when birth time changes', async () => {
      const updatedChart = { ...existingChart, birth_time: '16:45' };
      (supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce(createSelectChain(existingChart))
        .mockReturnValueOnce(createUpdateChain(updatedChart));
      (recalculateChart as jest.Mock).mockResolvedValue({
        snapshot: { id: 'snapshot-2', snapshot_version: 2 },
        positionCount: 12,
        aspectCount: 8,
        warnings: [],
      });

      const res = await handler(
        makeJsonRequest(`/api/charts/${CHART_ID}`, 'PATCH', {
          birthTime: '16:45:12',
          birthTimeKnown: true,
        }),
        { params: Promise.resolve({ chartId: CHART_ID }) },
      );
      const body = await res.json();

      const updateCall = (supabaseAdmin.from as jest.Mock).mock.results[1].value.update;

      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          birth_time: '16:45',
          birth_time_known: true,
        }),
      );
      expect(recalculateChart).toHaveBeenCalledWith(CHART_ID, 'user-123');
      expect(clearDailyForecastsForChart).toHaveBeenCalledWith(CHART_ID, 'user-123');
      expect(body).toEqual(
        expect.objectContaining({
          recalculated: true,
          snapshot: { id: 'snapshot-2', snapshot_version: 2 },
        }),
      );
    });

    it('does not recalculate when only a display field changes', async () => {
      const updatedChart = { ...existingChart, label: 'Updated Label' };
      (supabaseAdmin.from as jest.Mock)
        .mockReturnValueOnce(createSelectChain(existingChart))
        .mockReturnValueOnce(createUpdateChain(updatedChart));

      const res = await handler(
        makeJsonRequest(`/api/charts/${CHART_ID}`, 'PATCH', {
          label: 'Updated Label',
        }),
        { params: Promise.resolve({ chartId: CHART_ID }) },
      );
      const body = await res.json();

      expect(recalculateChart).not.toHaveBeenCalled();
      expect(clearDailyForecastsForChart).not.toHaveBeenCalled();
      expect(body).toEqual(
        expect.objectContaining({
          recalculated: false,
          forecastInvalidated: false,
        }),
      );
    });
  });
});
