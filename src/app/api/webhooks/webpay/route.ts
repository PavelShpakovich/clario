import { NextResponse } from 'next/server';
import { isWebpayEnabled } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';
import {
  getWebpayMissingConfig,
  isWebpayConfigured,
  parseWebpayNotificationPayload,
  verifyWebpayNotificationSignature,
} from '@/lib/billing/webpay';
import { processWebpayPaymentNotification } from '@/lib/billing/webpay-transactions';

export async function POST(req: Request) {
  const payload = await req.text();

  logger.info(
    { enabled: isWebpayEnabled(), payloadLength: payload.length },
    'WEBPAY webhook received',
  );

  if (!isWebpayEnabled()) {
    return NextResponse.json({ ok: false, error: 'WEBPAY is disabled' }, { status: 503 });
  }

  if (!isWebpayConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: `WEBPAY is missing configuration: ${getWebpayMissingConfig().join(', ')}`,
      },
      { status: 503 },
    );
  }

  const notification = parseWebpayNotificationPayload(payload);
  if (!notification) {
    return NextResponse.json({ ok: false, error: 'Invalid WEBPAY payload' }, { status: 400 });
  }

  if (!verifyWebpayNotificationSignature(notification)) {
    return NextResponse.json({ ok: false, error: 'Invalid WEBPAY signature' }, { status: 401 });
  }

  const result = await processWebpayPaymentNotification(notification);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'Webhook processing failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
