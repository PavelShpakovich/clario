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

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';

const mockFrom = supabaseAdmin.from as jest.Mock;

function routeParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

describe('reading routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/readings/[readingId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/readings/[readingId]/route');
      handler = mod.GET;
    });

    it('returns the reading payload with ordered sections and top-level status', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'readings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'reading-1',
                chart_id: 'chart-1',
                reading_type: 'natal_overview',
                title: 'Natal reading',
                summary: 'Short summary',
                status: 'ready',
                error_message: null,
                created_at: '2026-05-03T10:00:00.000Z',
                rendered_content_json: { summary: 'Short summary' },
              },
              error: null,
            }),
          };
        }

        if (table === 'reading_sections') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'section-1',
                  section_key: 'personality',
                  title: 'Personality',
                  content: 'Section 1',
                  sort_order: 1,
                },
                {
                  id: 'section-2',
                  section_key: 'career',
                  title: 'Career',
                  content: 'Section 2',
                  sort_order: 2,
                },
              ],
              error: null,
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        { method: 'GET' },
        routeParams({ readingId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('ready');
      expect(body.reading.id).toBe('reading-1');
      expect(body.reading.reading_sections).toEqual([
        {
          id: 'section-1',
          section_key: 'personality',
          title: 'Personality',
          content: 'Section 1',
          sort_order: 1,
        },
        {
          id: 'section-2',
          section_key: 'career',
          title: 'Career',
          content: 'Section 2',
          sort_order: 2,
        },
      ]);
    });
  });

  describe('DELETE /api/readings/[readingId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/readings/[readingId]/route');
      handler = mod.DELETE;
    });

    it('deletes only the owned reading after verifying it exists', async () => {
      const deleteEqUser = jest.fn().mockResolvedValue({ error: null });
      const deleteEqId = jest.fn().mockReturnValue({ eq: deleteEqUser });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'readings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'reading-1' },
              error: null,
            }),
            delete: jest.fn().mockReturnValue({ eq: deleteEqId }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        { method: 'DELETE' },
        routeParams({ readingId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true });
      expect(deleteEqId).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(deleteEqUser).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
