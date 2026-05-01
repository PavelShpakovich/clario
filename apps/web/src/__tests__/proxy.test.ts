jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    next: (init?: { request?: { headers?: Headers } }) => ({
      type: 'next',
      status: 200,
      headers: init?.request?.headers ?? new Headers(),
    }),
    redirect: (url: URL, init?: ResponseInit | number) => ({
      type: 'redirect',
      status: typeof init === 'number' ? init : (init?.status ?? 307),
      headers: new Headers({ location: url.toString() }),
    }),
    json: (body: unknown, init?: ResponseInit) => ({
      type: 'json',
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
      json: async () => body,
    }),
  },
}));

import { getToken } from 'next-auth/jwt';

function makeRequest(pathname: string, search = '') {
  return {
    url: `http://localhost${pathname}${search}`,
    method: 'GET',
    headers: new Headers(),
    nextUrl: {
      pathname,
      search,
    },
  };
}

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_MOBILE_ONLY;
  });

  it('allows unauthenticated access to /auth/reset-confirm', async () => {
    const { proxy } = await import('@/proxy');

    const res = await proxy(makeRequest('/auth/reset-confirm', '?u=test') as never);

    expect(res.type).toBe('next');
    expect(res.headers.get('x-pathname')).toBe('/auth/reset-confirm');
    expect(getToken).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated protected pages to login', async () => {
    (getToken as jest.Mock).mockResolvedValue(null);
    const { proxy } = await import('@/proxy');

    const res = await proxy(makeRequest('/dashboard', '?tab=home') as never);

    expect(res.type).toBe('redirect');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost/login?callbackUrl=%2Fdashboard%3Ftab%3Dhome',
    );
  });
});
