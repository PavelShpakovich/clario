import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { AppError, httpStatusForError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { REQUEST_ID_HEADER } from '@/lib/constants';

/**
 * Wraps an API route handler with:
 *  - Request ID generation and injection into response headers
 *  - Structured error logging with pino
 *  - Typed error → HTTP status mapping
 *
 * @example
 * export const GET = withApiHandler(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withApiHandler(
  handler: (req: Request, ctx?: unknown) => Promise<NextResponse>,
): (req: Request, ctx?: unknown) => Promise<NextResponse> {
  return async (req: Request, ctx?: unknown) => {
    const requestId = nanoid();
    const start = Date.now();

    try {
      const response = await handler(req, ctx);
      response.headers.set(REQUEST_ID_HEADER, requestId);

      logger.info(
        {
          requestId,
          method: req.method,
          url: req.url,
          status: response.status,
          durationMs: Date.now() - start,
        },
        'API request completed',
      );

      return response;
    } catch (err) {
      const durationMs = Date.now() - start;

      // Log the full error for debugging
      const errorToLog = err instanceof Error ? err : new Error(String(err));
      logger.error(
        {
          requestId,
          method: req.method,
          url: req.url,
          err: {
            message: errorToLog.message,
            stack: errorToLog.stack,
            name: errorToLog.name,
            // @ts-expect-error - capturing custom error properties
            code: err?.code,
            // @ts-expect-error - capturing custom error properties
            status: err?.status,
          },
          durationMs,
        },
        'API handler caught error',
      );

      if (err instanceof AppError) {
        const status = httpStatusForError(err);

        logger.warn(
          {
            requestId,
            method: req.method,
            url: req.url,
            errorCode: err.code,
            errorMessage: err.message,
            context: err.context,
            status,
            durationMs,
          },
          'API request failed with app error',
        );

        return NextResponse.json(
          { error: safeMessage(err), code: err.code, requestId },
          { status, headers: { [REQUEST_ID_HEADER]: requestId } },
        );
      }

      // Unhandled unexpected error
      logger.error(
        {
          requestId,
          method: req.method,
          url: req.url,
          err,
          durationMs,
        },
        'API request failed with unhandled error',
      );

      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500, headers: { [REQUEST_ID_HEADER]: requestId } },
      );
    }
  };
}

/** Returns a user-safe error message — never exposes internal details. */
function safeMessage(err: AppError): string {
  switch (err.code) {
    case 'NOT_FOUND':
      return err.message;
    case 'VALIDATION_ERROR':
      return err.message;
    case 'AUTH_ERROR':
      return 'Authentication required';
    case 'RATE_LIMIT_ERROR':
      return 'Too many requests — please slow down';
    case 'LLM_ERROR':
      return 'Card generation failed — please try again';
    case 'INGESTION_ERROR':
      return 'Failed to process the provided source — please check the file or URL';
    case 'INTERNAL_ERROR':
    default:
      return 'Internal server error';
  }
}
