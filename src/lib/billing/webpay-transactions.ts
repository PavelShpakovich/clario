import { logger } from '@/lib/logger';
import {
  parseWebpayOrderReference,
  resolveWebpayStatus,
  type WebpayNotificationPayload,
} from '@/lib/billing/webpay';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

const BILLING_PERIOD_DAYS = 30;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function buildBillingPeriodFrom(date: Date): { periodStart: string; periodEnd: string } {
  return {
    periodStart: date.toISOString(),
    periodEnd: addDays(date, BILLING_PERIOD_DAYS).toISOString(),
  };
}

export function buildNextBillingPeriod(currentPeriodEnd: string): {
  periodStart: string;
  periodEnd: string;
} {
  const start = new Date(currentPeriodEnd);
  return buildBillingPeriodFrom(start);
}

export async function processWebpayPaymentNotification(
  notification: WebpayNotificationPayload,
): Promise<{
  ok: boolean;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  transactionId?: string;
  error?: string;
}> {
  const transactionId = parseWebpayOrderReference(notification.siteOrderId) ?? undefined;
  const externalTransactionId = notification.transactionId || transactionId;

  if (!transactionId || !externalTransactionId) {
    return { ok: false, status: 'failed', error: 'Missing transaction metadata' };
  }

  const { data: storedTransaction } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, user_id, plan_id, subscription_id, kind, period_start, period_end')
    .eq('id', transactionId)
    .eq('provider', 'webpay')
    .maybeSingle();

  if (!storedTransaction) {
    return { ok: false, status: 'failed', error: 'Transaction not found' };
  }

  const status = resolveWebpayStatus(
    notification.rcText,
    notification.paymentType,
    notification.rc,
  );

  const resolvedUserId = notification.customerId ?? storedTransaction.user_id;
  const resolvedPlanId = storedTransaction.plan_id ?? 'free';
  const amountMinor = Math.round(Number(notification.amount || 0) * 100);
  const currency = String(notification.currencyId || 'BYN');

  const { error: paymentError } = await supabaseAdmin
    .from('payment_transactions')
    .update({
      external_transaction_id: externalTransactionId,
      external_customer_id: notification.customerId ?? null,
      external_subscription_id: notification.recurringToken ?? null,
      status,
      amount_minor: amountMinor,
      currency,
      raw_payload: notification as unknown as Json,
    })
    .eq('id', transactionId)
    .eq('provider', 'webpay');

  if (paymentError) {
    logger.error({ paymentError, transactionId }, 'Failed to update WEBPAY transaction');
    return { ok: false, status, error: 'Transaction update failed' };
  }

  if (status !== 'paid') {
    return { ok: true, status, transactionId };
  }

  const periodStart = storedTransaction.period_start ?? new Date().toISOString();
  const periodEnd =
    storedTransaction.period_end ??
    addDays(new Date(periodStart), BILLING_PERIOD_DAYS).toISOString();

  const existingSubscription = storedTransaction.subscription_id
    ? await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('id', storedTransaction.subscription_id)
        .maybeSingle()
    : await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

  const subscriptionPayload = {
    user_id: resolvedUserId,
    plan_id: resolvedPlanId,
    billing_provider: 'webpay',
    billing_customer_id: notification.customerId ?? null,
    billing_subscription_id: notification.recurringToken ?? externalTransactionId,
    status: 'active',
    auto_renew: true,
    current_period_start: periodStart,
    current_period_end: periodEnd,
  };

  const { data: savedSubscription, error: subscriptionError } = existingSubscription.data?.id
    ? await supabaseAdmin
        .from('user_subscriptions')
        .update(subscriptionPayload)
        .eq('id', existingSubscription.data.id)
        .select('id')
        .single()
    : await supabaseAdmin
        .from('user_subscriptions')
        .insert(subscriptionPayload)
        .select('id')
        .single();

  if (subscriptionError || !savedSubscription) {
    logger.error(
      { subscriptionError, userId: resolvedUserId, transactionId },
      'Failed to persist WEBPAY subscription',
    );
    return { ok: false, status, error: 'Subscription update failed' };
  }

  await supabaseAdmin
    .from('payment_transactions')
    .update({ subscription_id: savedSubscription.id })
    .eq('id', transactionId)
    .eq('provider', 'webpay');

  return { ok: true, status, transactionId };
}
