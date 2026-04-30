import {
  NotFoundError,
  ValidationError,
  LlmError,
  AuthError,
  RateLimitError,
  InsufficientCreditsError,
  ForbiddenError,
  httpStatusForError,
} from '@/lib/errors';

describe('AppError subclasses', () => {
  it('NotFoundError has correct code and maps to 404', () => {
    const err = new NotFoundError({ message: 'Card not found' });
    expect(err.code).toBe('NOT_FOUND');
    expect(httpStatusForError(err)).toBe(404);
    expect(err.message).toBe('Card not found');
  });

  it('ValidationError maps to 422', () => {
    const err = new ValidationError({ message: 'Invalid input' });
    expect(httpStatusForError(err)).toBe(422);
  });

  it('LlmError maps to 500', () => {
    const err = new LlmError({ message: 'LLM failed' });
    expect(httpStatusForError(err)).toBe(500);
  });

  it('AuthError maps to 401', () => {
    const err = new AuthError({ message: 'Unauthorized' });
    expect(httpStatusForError(err)).toBe(401);
  });

  it('RateLimitError maps to 429', () => {
    const err = new RateLimitError({ message: 'Slow down' });
    expect(httpStatusForError(err)).toBe(429);
  });

  it('preserves context', () => {
    const err = new ValidationError({ message: 'Bad', context: { field: 'email' } });
    expect(err.context).toEqual({ field: 'email' });
  });

  it('InsufficientCreditsError maps to 402', () => {
    const err = new InsufficientCreditsError({
      message: 'Not enough credits',
      context: { balance: 1, required: 3, userId: 'u1' },
    });
    expect(err.code).toBe('INSUFFICIENT_CREDITS');
    expect(httpStatusForError(err)).toBe(402);
    expect(err.context.balance).toBe(1);
    expect(err.context.required).toBe(3);
  });

  it('ForbiddenError maps to 403', () => {
    const err = new ForbiddenError({ message: 'Access denied' });
    expect(err.code).toBe('FORBIDDEN');
    expect(httpStatusForError(err)).toBe(403);
  });
});
