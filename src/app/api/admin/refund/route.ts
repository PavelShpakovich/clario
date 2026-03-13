import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';

/**
 * POST /api/admin/refund
 *
 * Admin-only endpoint to refund a Telegram Stars payment.
 * Calls refundStarPayment via Telegram Bot API.
 */
export const POST = withApiHandler(async (req) => {
  void req;
  throw new ValidationError({ message: 'Telegram refunds are no longer supported' });
});
