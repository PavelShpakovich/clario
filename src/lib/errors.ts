// ─── Typed error hierarchy ────────────────────────────────────────────────────

export type AppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'LLM_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR';

interface AppErrorOptions {
  message: string;
  cause?: unknown;
  /** Extra context attached to Sentry breadcrumbs / logs. */
  context?: Record<string, unknown>;
}

// ─── Base class ───────────────────────────────────────────────────────────────

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context: Record<string, unknown>;

  constructor(code: AppErrorCode, { message, cause, context = {} }: AppErrorOptions) {
    super(message, { cause });
    this.name = code;
    this.code = code;
    this.context = context;
  }
}

// ─── Concrete error types ─────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('NOT_FOUND', opts);
  }
}

export class ValidationError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('VALIDATION_ERROR', opts);
  }
}

export class LlmError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('LLM_ERROR', opts);
  }
}

export class AuthError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('AUTH_ERROR', opts);
  }
}

export class RateLimitError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('RATE_LIMIT_ERROR', opts);
  }
}

// ─── HTTP status mapping ──────────────────────────────────────────────────────

export function httpStatusForError(error: AppError): number {
  switch (error.code) {
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
      return 422;
    case 'AUTH_ERROR':
      return 401;
    case 'RATE_LIMIT_ERROR':
      return 429;
    case 'LLM_ERROR':
    case 'INTERNAL_ERROR':
      return 500;
  }
}
