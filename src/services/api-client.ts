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
  const response = await fetch(input, init);
  const data = await readJsonResponse<T & { error?: string; message?: string } & TError>(response);

  if (!response.ok) {
    const message = data?.error ?? data?.message ?? 'Request failed';
    throw new ApiClientError<TError>(message, response.status, (data ?? undefined) as TError);
  }

  return data as T;
}
