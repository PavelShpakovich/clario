jest.mock('@/lib/api/handler', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withApiHandler: (fn: (...args: any[]) => any) => fn,
}));

jest.mock('@/lib/api/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'user@example.com', isAdmin: false },
  }),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    }),
    redirect: (url: URL | string, init?: ResponseInit) => ({
      status: init?.status ?? 307,
      headers: new Headers({ location: String(url) }),
    }),
  },
}));

jest.mock('@/lib/auth/user-accounts', () => ({
  findAuthUserByEmail: jest.fn(),
}));

jest.mock('@/lib/email/send-verification', () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock('@/lib/auth/account-identities', () => ({
  ensureSupabaseIdentityLink: jest.fn(),
}));

jest.mock('@/lib/credits/service', () => ({
  addCredits: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/auth/email-verification', () => ({
  clearEmailVerificationTokensForUser: jest.fn(),
  consumeEmailVerificationToken: jest.fn(),
  findEmailVerificationToken: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn(),
  getClientIp: jest.fn(),
  rateLimitHeaders: jest.fn(),
}));

jest.mock('@/lib/email/resend', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: jest.fn(),
        generateLink: jest.fn(),
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
        signOut: jest.fn(),
      },
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { findAuthUserByEmail } from '@/lib/auth/user-accounts';
import { sendVerificationEmail } from '@/lib/email/send-verification';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';
import { addCredits } from '@/lib/credits/service';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email/resend';
import {
  clearEmailVerificationTokensForUser,
  consumeEmailVerificationToken,
  findEmailVerificationToken,
} from '@/lib/auth/email-verification';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

function makeJsonRequest(url: string, body: unknown): Partial<Request> {
  return {
    url: `http://localhost${url}`,
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

function makeAuthRequest(url: string, accessToken: string): Partial<Request> {
  return {
    url: `http://localhost${url}`,
    method: 'POST',
    headers: new Headers({ authorization: `Bearer ${accessToken}` }),
  };
}

function makeGetRequest(url: string): Partial<Request> {
  return {
    url: `http://localhost${url}`,
    method: 'GET',
  };
}

describe('POST /api/auth/register', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;
  const upsert = jest.fn();

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/register/route');
    handler = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
    (checkRateLimit as jest.Mock).mockReturnValue({
      allowed: true,
      remaining: 2,
      resetAt: Date.now() + 60_000,
    });
    (rateLimitHeaders as jest.Mock).mockReturnValue({ 'X-RateLimit-Remaining': '2' });
    (supabaseAdmin.from as jest.Mock).mockReturnValue({ upsert });
    upsert.mockResolvedValue({ error: null });
    (addCredits as jest.Mock).mockResolvedValue({ newBalance: 5 });
    (ensureSupabaseIdentityLink as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns the generic verification response for an existing confirmed account', async () => {
    (findAuthUserByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      emailConfirmedAt: '2026-01-01T00:00:00.000Z',
    });

    const res = await handler(
      makeJsonRequest('/api/auth/register', {
        email: 'user@example.com',
        password: 'password123',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, needsVerification: true });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('resends verification for an existing unconfirmed account', async () => {
    (findAuthUserByEmail as jest.Mock).mockResolvedValue({
      id: 'user-2',
      email: 'user@example.com',
      emailConfirmedAt: null,
    });

    const res = await handler(
      makeJsonRequest('/api/auth/register', {
        email: 'user@example.com',
        password: 'password123',
        source: 'mobile',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, needsVerification: true });
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      userId: 'user-2',
      email: 'user@example.com',
      source: 'mobile',
    });
  });
});

describe('POST /api/auth/password/reset', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/password/reset/route');
    handler = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
  });

  it('returns success with rate-limit headers when throttled', async () => {
    (checkRateLimit as jest.Mock).mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    (rateLimitHeaders as jest.Mock).mockReturnValue({
      'X-RateLimit-Remaining': '0',
      'Retry-After': '60',
    });

    const res = await handler(
      makeJsonRequest('/api/auth/password/reset', {
        email: 'user@example.com',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(supabaseAdmin.auth.admin.generateLink).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends a reset email and preserves rate-limit headers on success', async () => {
    (checkRateLimit as jest.Mock).mockReturnValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 60_000,
    });
    (rateLimitHeaders as jest.Mock).mockReturnValue({ 'X-RateLimit-Remaining': '4' });
    (supabaseAdmin.auth.admin.generateLink as jest.Mock).mockResolvedValue({
      error: null,
      data: {
        properties: {
          action_link: 'https://supabase.example/auth/verify?token=abc',
        },
      },
    });

    const res = await handler(
      makeJsonRequest('/api/auth/password/reset', {
        email: 'user@example.com',
        source: 'mobile',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/auth/resend-verification', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/resend-verification/route');
    handler = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getClientIp as jest.Mock).mockReturnValue('127.0.0.1');
  });

  it('returns success without resending when rate-limited', async () => {
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: false, resetAt: Date.now() + 60_000 });

    const res = await handler(
      makeJsonRequest('/api/auth/resend-verification', {
        email: 'user@example.com',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(findAuthUserByEmail).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('normalizes the email and resends only for an unconfirmed user', async () => {
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, resetAt: Date.now() + 60_000 });
    (findAuthUserByEmail as jest.Mock).mockResolvedValue({
      id: 'user-2',
      email: 'user@example.com',
      emailConfirmedAt: null,
    });

    const res = await handler(
      makeJsonRequest('/api/auth/resend-verification', {
        email: ' User@Example.com ',
        source: 'mobile',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(findAuthUserByEmail).toHaveBeenCalledWith('user@example.com');
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      userId: 'user-2',
      email: 'user@example.com',
      source: 'mobile',
    });
  });
});

describe('POST /api/auth/password/confirm-reset', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/password/confirm-reset/route');
    handler = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      error: null,
      data: {
        user: {
          id: 'user-123',
          email_confirmed_at: null,
        },
      },
    });
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ error: null });
    (supabaseAdmin.auth.admin.signOut as jest.Mock).mockResolvedValue({ error: null });
    (clearEmailVerificationTokensForUser as jest.Mock).mockResolvedValue(undefined);
  });

  it('confirms email, revokes other sessions, and clears verification tokens', async () => {
    const res = await handler(
      makeAuthRequest('/api/auth/password/confirm-reset', 'recovery-token'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith('recovery-token');
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
      email_confirm: true,
    });
    expect(supabaseAdmin.auth.admin.signOut).toHaveBeenCalledWith('recovery-token', 'others');
    expect(clearEmailVerificationTokensForUser).toHaveBeenCalledWith('user-123');
  });

  it('continues successfully if revoking other sessions fails', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      error: null,
      data: {
        user: {
          id: 'user-123',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    (supabaseAdmin.auth.admin.signOut as jest.Mock).mockResolvedValue({
      error: { message: 'logout failed' },
    });

    const res = await handler(
      makeAuthRequest('/api/auth/password/confirm-reset', 'recovery-token'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      { error: { message: 'logout failed' }, userId: 'user-123' },
      'Failed to revoke other sessions after password reset',
    );
    expect(clearEmailVerificationTokensForUser).toHaveBeenCalledWith('user-123');
  });
});

describe('PATCH /api/profile/password', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any) => Promise<any>;

  beforeAll(async () => {
    const mod = await import('@/app/api/profile/password/route');
    handler = mod.PATCH;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, resetAt: Date.now() + 60_000 });
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ error: null });
  });

  it('updates the authenticated user password when validation passes', async () => {
    const res = await handler(
      makeJsonRequest('/api/profile/password', {
        password: 'StrongPass1',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
      password: 'StrongPass1',
    });
  });

  it('rejects invalid passwords before calling Supabase', async () => {
    await expect(
      handler(
        makeJsonRequest('/api/profile/password', {
          password: 'weak',
        }),
      ),
    ).rejects.toThrow('Password must be at least 8 characters');

    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
});
