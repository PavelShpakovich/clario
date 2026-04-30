let _baseUrl = '';
let _authTokenGetter: (() => Promise<string | null>) | null = null;

export function configure(options: { baseUrl: string }) {
  _baseUrl = options.baseUrl.replace(/\/$/, '');
}

export function setAuthTokenGetter(getter: () => Promise<string | null>): void {
  _authTokenGetter = getter;
}

export function resolveUrl(path: string): string {
  return path.startsWith('/') ? `${_baseUrl}${path}` : path;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!_authTokenGetter) return {};
  const token = await _authTokenGetter();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiClientError<TData = Record<string, unknown>> extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data?: TData;

  constructor(message: string, status: number, data?: TData) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;

    const maybeError = data && typeof data === 'object' ? Reflect.get(data, 'error') : undefined;
    this.code = typeof maybeError === 'string' ? maybeError : undefined;
  }
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchJson<T, TError = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const url = typeof input === 'string' ? resolveUrl(input) : input;
  let reqInit = init;
  if (typeof input === 'string' && _authTokenGetter) {
    const token = await _authTokenGetter();
    if (token) {
      const merged: Record<string, string> = {};
      const existing = init?.headers;
      if (existing instanceof Headers) {
        existing.forEach((v: string, k: string) => {
          merged[k] = v;
        });
      } else if (Array.isArray(existing)) {
        (existing as string[][]).forEach(([k, v]) => {
          merged[k] = v;
        });
      } else if (existing) {
        Object.assign(merged, existing);
      }
      merged['Authorization'] = `Bearer ${token}`;
      reqInit = { ...init, headers: merged };
    }
  }
  const response = await fetch(url, reqInit);
  const data = await readJsonResponse<T & { error?: string; message?: string } & TError>(response);

  if (!response.ok) {
    const message = data?.error ?? data?.message ?? 'Request failed';
    throw new ApiClientError<TError>(message, response.status, (data ?? undefined) as TError);
  }

  return data as T;
}
