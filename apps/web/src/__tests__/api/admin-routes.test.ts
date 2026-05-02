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
  requireAdmin: jest.fn().mockResolvedValue({ user: { id: 'admin-1' } }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        listUsers: jest.fn(),
      },
    },
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';

type QueryResult<T> = Promise<{ data: T; error: null; count?: number }>;

function countQuery(count: number) {
  return {
    gte: jest.fn().mockResolvedValue({ data: null, error: null, count }),
    not: jest.fn().mockResolvedValue({ data: null, error: null, count }),
    lt: jest.fn().mockResolvedValue({ data: null, error: null, count }),
    in: jest.fn().mockResolvedValue({ data: null, error: null, count }),
    then: undefined,
  };
}

function rowQuery<T>(data: T) {
  return {
    gte: jest.fn().mockResolvedValue({ data, error: null }),
    not: jest.fn().mockResolvedValue({ data, error: null }),
    lt: jest.fn().mockResolvedValue({ data, error: null }),
    in: jest.fn().mockResolvedValue({ data, error: null }),
    then: undefined,
  };
}

describe('admin routes canonical sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/analytics', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (...args: any[]) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/admin/analytics/route');
      handler = mod.GET;
    });

    it('uses canonical chart and reading counts for totals and monthly metrics', async () => {
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => ({
        select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => {
          if (table === 'profiles' && options?.head) {
            if (columns === '*') {
              return {
                gte: jest.fn().mockResolvedValue({ data: null, error: null, count: 2 }),
                then: undefined,
                ...{ data: null, error: null, count: 10 },
              };
            }
          }

          if (table === 'charts' && options?.head) {
            return {
              gte: jest.fn().mockResolvedValue({ data: null, error: null, count: 3 }),
              then: undefined,
              ...{ data: null, error: null, count: 7 },
            };
          }

          if (table === 'readings' && options?.head) {
            return {
              gte: jest.fn().mockResolvedValue({ data: null, error: null, count: 4 }),
              then: undefined,
              ...{ data: null, error: null, count: 9 },
            };
          }

          if (table === 'compatibility_reports' && options?.head) {
            return { data: null, error: null, count: 5 };
          }

          if (table === 'generation_logs' && options?.head) {
            return {
              gte: jest.fn().mockResolvedValue({ data: null, error: null, count: 6 }),
              not: jest.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
              data: null,
              error: null,
              count: 12,
            };
          }

          if (table === 'follow_up_messages' && options?.head) {
            return { data: null, error: null, count: 8 };
          }

          if (table === 'follow_up_messages' && columns === 'usage_tokens') {
            return {
              not: jest.fn().mockResolvedValue({
                data: [{ usage_tokens: 10 }, { usage_tokens: 5 }],
                error: null,
              }),
            };
          }

          if (table === 'generation_logs' && columns === 'usage_tokens') {
            return {
              not: jest.fn().mockResolvedValue({
                data: [{ usage_tokens: 20 }, { usage_tokens: 15 }],
                error: null,
              }),
            };
          }

          if (table === 'readings' && columns === 'reading_type') {
            return {
              data: [
                { reading_type: 'natal' },
                { reading_type: 'natal' },
                { reading_type: 'yearly' },
              ],
              error: null,
            };
          }

          if (table === 'credit_transactions' && columns === 'amount') {
            return {
              lt: jest.fn().mockResolvedValue({
                data: [{ amount: -5 }, { amount: -7 }],
                error: null,
              }),
            };
          }

          throw new Error(`Unexpected query: ${table} ${columns}`);
        },
      }));

      const res = await handler();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          totalUsers: 10,
          newUsersThisMonth: 2,
          totalCharts: 7,
          chartsThisMonth: 3,
          totalReadings: 9,
          readingsThisMonth: 4,
          totalCompatibilityReports: 5,
          totalAiCalls: 12,
          aiCallsThisMonth: 6,
          aiErrors: 1,
          totalFollowUpMessages: 8,
          totalTokensUsed: 50,
          totalCreditsSpent: 12,
          readingsByType: { natal: 2, yearly: 1 },
        }),
      );
      expect(supabaseAdmin.from).not.toHaveBeenCalledWith('usage_counters');
    });
  });

  describe('GET /api/admin/users', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/admin/users/route');
      handler = mod.GET;
    });

    it('builds per-user chart and reading counts from canonical tables', async () => {
      (supabaseAdmin.auth.admin.listUsers as jest.Mock).mockResolvedValue({
        data: {
          users: [
            {
              id: 'user-1',
              email: 'user1@example.com',
              email_confirmed_at: '2026-01-01T00:00:00.000Z',
              created_at: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'user-2',
              email: 'user2@example.com',
              email_confirmed_at: null,
              created_at: '2026-02-01T00:00:00.000Z',
            },
          ],
          total: 2,
        },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => ({
        select: (columns: string) => {
          if (table === 'profiles') {
            return {
              in: jest.fn().mockResolvedValue({
                data: [
                  { id: 'user-1', display_name: 'User One', is_admin: true },
                  { id: 'user-2', display_name: 'User Two', is_admin: false },
                ],
                error: null,
              }),
            };
          }

          if (table === 'charts') {
            return {
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [{ user_id: 'user-1' }],
                  error: null,
                }),
                data:
                  columns === 'user_id'
                    ? [{ user_id: 'user-1' }, { user_id: 'user-1' }, { user_id: 'user-2' }]
                    : null,
                error: null,
              }),
            };
          }

          if (table === 'readings') {
            return {
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  data: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
                  error: null,
                }),
                data:
                  columns === 'user_id'
                    ? [
                        { user_id: 'user-1' },
                        { user_id: 'user-1' },
                        { user_id: 'user-1' },
                        { user_id: 'user-2' },
                      ]
                    : null,
                error: null,
              }),
            };
          }

          if (table === 'user_credits') {
            return {
              in: jest.fn().mockResolvedValue({
                data: [
                  { user_id: 'user-1', balance: 5 },
                  { user_id: 'user-2', balance: 0 },
                ],
                error: null,
              }),
            };
          }

          throw new Error(`Unexpected table ${table}`);
        },
      }));

      const res = await handler({ url: 'http://localhost/api/admin/users?page=1&perPage=20' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.users).toEqual([
        expect.objectContaining({
          id: 'user-1',
          displayName: 'User One',
          isAdmin: true,
          totalCharts: 2,
          chartsThisMonth: 1,
          totalReadings: 3,
          readingsThisMonth: 1,
          creditBalance: 5,
        }),
        expect.objectContaining({
          id: 'user-2',
          displayName: 'User Two',
          isAdmin: false,
          totalCharts: 1,
          chartsThisMonth: 0,
          totalReadings: 1,
          readingsThisMonth: 1,
          creditBalance: 0,
        }),
      ]);
      expect(supabaseAdmin.from).not.toHaveBeenCalledWith('usage_counters');
    });
  });
});
