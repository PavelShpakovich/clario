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

jest.mock('@/lib/llm/structured-generation', () => ({
  streamChatResponse: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  env: {
    LLM_PROVIDER: 'mock',
    QWEN_MODEL: 'qwen-plus',
  },
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { streamChatResponse } from '@/lib/llm/structured-generation';

const mockFrom = supabaseAdmin.from as jest.Mock;

class TestResponse {
  status: number;
  headers: Headers;
  private readonly bodyText: string;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    this.headers = new Headers(init?.headers);
    this.bodyText = typeof body === 'string' ? body : '';
  }

  async json() {
    return JSON.parse(this.bodyText || 'null');
  }
}

function routeParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

function jsonRequest(body: unknown): Partial<Request> {
  return {
    method: 'POST',
    json: async () => body,
  };
}

describe('chat routes', () => {
  const originalResponse = global.Response;

  beforeAll(() => {
    global.Response = TestResponse as unknown as typeof Response;
  });

  afterAll(() => {
    global.Response = originalResponse;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/chat/[readingId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('@/app/api/chat/[readingId]/route');
      handler = mod.GET;
    });

    it('returns the thread with persisted message usage and limit', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'readings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'reading-1', title: 'Reading title', chart_id: 'chart-1' },
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
          };
        }

        if (table === 'follow_up_messages') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'm1',
                  role: 'user',
                  content: 'Hi',
                  created_at: '2026-01-01',
                  model_provider: null,
                  model_name: null,
                },
                {
                  id: 'm2',
                  role: 'assistant',
                  content: 'Hello',
                  created_at: '2026-01-01',
                  model_provider: 'mock',
                  model_name: 'mock',
                },
                {
                  id: 'm3',
                  role: 'user',
                  content: 'Tell me more',
                  created_at: '2026-01-02',
                  model_provider: null,
                  model_name: null,
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
      expect(body).toEqual({
        threadId: 'thread-1',
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'Hi',
            created_at: '2026-01-01',
            model_provider: null,
            model_name: null,
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'Hello',
            created_at: '2026-01-01',
            model_provider: 'mock',
            model_name: 'mock',
          },
          {
            id: 'm3',
            role: 'user',
            content: 'Tell me more',
            created_at: '2026-01-02',
            model_provider: null,
            model_name: null,
          },
        ],
        messagesUsed: 2,
        messagesLimit: 10,
      });
    });
  });

  describe('POST /api/chat/[readingId]', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: (req: any, ctx: any) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/chat/[readingId]/route');
      handler = mod.POST;
    });

    it('returns 429 before streaming when the thread message limit is reached', async () => {
      const insert = jest.fn();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'readings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'reading-1',
                title: 'Reading title',
                reading_type: 'natal_overview',
                summary: 'Summary',
                chart_id: 'chart-1',
                chart_snapshot_id: 'snapshot-1',
              },
              error: null,
            }),
          };
        }

        if (table === 'reading_sections') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === 'follow_up_threads') {
          return {
            upsert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'thread-1', message_limit: 5 },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'follow_up_messages') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
              }),
            }),
            insert,
          };
        }

        if (table === 'chart_positions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await handler(
        jsonRequest({ message: 'What does this mean?' }),
        routeParams({ readingId: '550e8400-e29b-41d4-a716-446655440000' }),
      );
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body).toEqual({ error: 'limit_reached', messagesLimit: 5 });
      expect(insert).not.toHaveBeenCalled();
      expect(streamChatResponse).not.toHaveBeenCalled();
    });
  });
});
