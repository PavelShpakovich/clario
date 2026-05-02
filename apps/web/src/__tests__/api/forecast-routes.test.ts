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
    user: { id: 'user-123', email: 'user@example.com', isAdmin: false },
  }),
}));

jest.mock('@/lib/forecasts/service', () => ({
  getOrCreateDailyForecast: jest.fn(),
  generateDailyForecast: jest.fn(),
}));

jest.mock('@/lib/credits/service', () => ({
  hasForecastAccess: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasForecastAccess } from '@/lib/credits/service';
import { generateDailyForecast, getOrCreateDailyForecast } from '@/lib/forecasts/service';

const mockFrom = supabaseAdmin.from as jest.Mock;

function routeParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

describe('forecast routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/forecasts/daily', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/forecasts/daily/route');
      handler = mod.GET;
    });

    it('returns a preview when the forecast is ready but access is not unlocked', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'charts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'chart-1', person_name: 'Alice' },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { display_name: 'Alice Profile', timezone: 'Europe/Minsk' },
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });
      (getOrCreateDailyForecast as jest.Mock).mockResolvedValue({
        id: 'forecast-1',
        target_start_date: '2026-05-03',
        rendered_content_json: {
          interpretation: 'Первый абзац.\n\nВторой абзац.',
          advice: 'Совет',
          keyTheme: 'Тема',
        },
      });
      (hasForecastAccess as jest.Mock).mockResolvedValue(false);

      const res = await handler({ method: 'GET' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getOrCreateDailyForecast).toHaveBeenCalledWith('user-123', 'chart-1', 'Europe/Minsk');
      expect(body.preview).toBe(true);
      expect(body.fullAccessRequired).toBe(true);
      expect(body.displayName).toBe('Alice Profile');
      expect(body.forecast.status).toBe('ready');
      expect(body.forecast.rendered_content_json.interpretation).toBe('Первый абзац.');
      expect(body.forecast.rendered_content_json.advice).toBe('Совет');
    });

    it('returns the full forecast and pending access flag when content is still generating', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'charts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'chart-1', person_name: 'Alice' },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { display_name: null, timezone: 'Europe/Minsk' },
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });
      (getOrCreateDailyForecast as jest.Mock).mockResolvedValue({
        id: 'forecast-2',
        target_start_date: '2026-05-03',
        rendered_content_json: null,
      });
      (hasForecastAccess as jest.Mock).mockResolvedValue(false);

      const res = await handler({ method: 'GET' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.preview).toBe(false);
      expect(body.fullAccessRequired).toBe(true);
      expect(body.displayName).toBe('Alice');
      expect(body.forecast.status).toBe('pending');
      expect(body.forecast.rendered_content_json).toBeNull();
    });
  });

  describe('POST /api/forecasts/[forecastId]/generate', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/forecasts/[forecastId]/generate/route');
      handler = mod.POST;
    });

    it('loads the user timezone and starts forecast generation', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { timezone: 'Europe/Minsk' },
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        { method: 'POST' },
        routeParams({ forecastId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(generateDailyForecast).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'user-123',
        'Europe/Minsk',
      );
    });
  });
});
