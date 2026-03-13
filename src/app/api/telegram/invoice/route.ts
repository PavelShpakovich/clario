import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';

/**
 * POST /api/telegram/invoice
 *
 * Generate a Telegram Stars invoice link for plan upgrade.
 *
 * Request body: { planId: 'basic' | 'pro' | 'max' }
 * Response: { invoiceLink: string }
 *
 * The client will open this link with tg.openInvoice(invoiceLink, callback)
 */
export const POST = withApiHandler(async (req) => {
  void req;
  throw new ValidationError({ message: 'Telegram billing has been removed' });
});
