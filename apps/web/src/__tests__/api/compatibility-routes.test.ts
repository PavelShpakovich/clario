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

jest.mock('@/lib/compatibility/service', () => ({
  computeHarmonyScore: jest.fn(),
  generateCompatibilityContent: jest.fn(),
  resetCompatibilityForRetry: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  computeHarmonyScore,
  generateCompatibilityContent,
  resetCompatibilityForRetry,
} from '@/lib/compatibility/service';

const mockFrom = supabaseAdmin.from as jest.Mock;

function routeParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

describe('compatibility routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/compatibility/[reportId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/compatibility/[reportId]/route');
      handler = mod.GET;
    });

    it('returns the report with chart names and derived harmony score for ready reports', async () => {
      (computeHarmonyScore as jest.Mock).mockReturnValue(87);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'compatibility_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'report-1',
                user_id: 'user-123',
                primary_chart_id: 'chart-1',
                secondary_chart_id: 'chart-2',
                status: 'ready',
                compatibility_type: 'family',
              },
              error: null,
            }),
          };
        }

        if (table === 'charts') {
          const eq = jest.fn().mockImplementation((_column: string, value: string) => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data:
                value === 'chart-1'
                  ? { id: 'chart-1', person_name: 'Alice' }
                  : { id: 'chart-2', person_name: 'Bob' },
              error: null,
            }),
          }));

          return {
            select: jest.fn().mockReturnThis(),
            eq,
          };
        }

        if (table === 'chart_snapshots') {
          const limit = jest
            .fn()
            .mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'snap-1' }, error: null }),
            })
            .mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'snap-2' }, error: null }),
            });

          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit,
          };
        }

        if (table === 'chart_positions') {
          const eq = jest
            .fn()
            .mockResolvedValueOnce({ data: [{ body_key: 'sun', degree_decimal: 10 }], error: null })
            .mockResolvedValueOnce({
              data: [{ body_key: 'moon', degree_decimal: 20 }],
              error: null,
            });

          return {
            select: jest.fn().mockReturnThis(),
            eq,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        { method: 'GET' },
        routeParams({ reportId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(computeHarmonyScore).toHaveBeenCalled();
      expect(body.report.primary_person_name).toBe('Alice');
      expect(body.report.secondary_person_name).toBe('Bob');
      expect(body.report.harmony_score).toBe(87);
    });

    it('returns a pending report without attempting harmony score calculation', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'compatibility_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'report-2',
                user_id: 'user-123',
                primary_chart_id: 'chart-1',
                secondary_chart_id: 'chart-2',
                status: 'pending',
              },
              error: null,
            }),
          };
        }

        if (table === 'charts') {
          const eq = jest.fn().mockImplementation((_column: string, value: string) => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data:
                value === 'chart-1'
                  ? { id: 'chart-1', person_name: 'Alice' }
                  : { id: 'chart-2', person_name: 'Bob' },
              error: null,
            }),
          }));

          return {
            select: jest.fn().mockReturnThis(),
            eq,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        { method: 'GET' },
        routeParams({ reportId: '550e8400-e29b-41d4-a716-446655440001' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(computeHarmonyScore).not.toHaveBeenCalled();
      expect(body.report.harmony_score).toBeNull();
    });
  });

  describe('DELETE /api/compatibility/[reportId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/compatibility/[reportId]/route');
      handler = mod.DELETE;
    });

    it('deletes only the owned report after verifying it exists', async () => {
      const deleteEqUser = jest.fn().mockResolvedValue({ error: null });
      const deleteEqId = jest.fn().mockReturnValue({ eq: deleteEqUser });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'compatibility_reports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'report-1' }, error: null }),
            delete: jest.fn().mockReturnValue({ eq: deleteEqId }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        { method: 'DELETE' },
        routeParams({ reportId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(deleteEqId).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(deleteEqUser).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('POST /api/compatibility/[reportId]/generate', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/compatibility/[reportId]/generate/route');
      handler = mod.POST;
    });

    it('starts compatibility generation for the current user', async () => {
      const res = await handler(
        { method: 'POST' },
        routeParams({ reportId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(generateCompatibilityContent).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'user-123',
      );
    });
  });

  describe('POST /api/compatibility/[reportId]/retry', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/compatibility/[reportId]/retry/route');
      handler = mod.POST;
    });

    it('resets compatibility generation for retry', async () => {
      const res = await handler(
        { method: 'POST' },
        routeParams({ reportId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(resetCompatibilityForRetry).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'user-123',
      );
    });
  });
});
