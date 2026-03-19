import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  buildWebpayRecurringPaymentSession,
  buildWebpayUnbindSession,
  parseWebpayNotificationPayload,
  parseWebpayUnbindResponse,
  sendWebpayFormRequest,
} from '@/lib/billing/webpay';
import {
  buildNextBillingPeriod,
  processWebpayPaymentNotification,
} from '@/lib/billing/webpay-transactions';
import type { Json } from '@/lib/supabase/types';

/**
 * GET /api/cron/subscription-renewal
 *
 * Called daily by Vercel Cron.
 * Expires subscriptions whose current_period_end has passed and clears stale usage.
 *
 * Secured with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────
  const secret = env.CRON_SECRET;
  if (!secret) {
    // CRON_SECRET must always be set — an unprotected cron endpoint is a security risk.
    logger.error('CRON_SECRET is not configured — rejecting request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let renewalAttempted = 0;
  let renewalSucceeded = 0;
  let renewalFailed = 0;
  let unbound = 0;

  const { data: dueRenewals } = await supabaseAdmin
    .from('user_subscriptions')
    .select(
      'id, user_id, plan_id, current_period_end, billing_customer_id, billing_subscription_id',
    )
    .eq('status', 'active')
    .eq('auto_renew', true)
    .eq('billing_provider', 'webpay')
    .lt('current_period_end', now.toISOString());

  const renewalPlanIds = Array.from(new Set((dueRenewals ?? []).map((row) => row.plan_id)));
  const { data: renewalPlans } = renewalPlanIds.length
    ? await supabaseAdmin
        .from('subscription_plans')
        .select('id, name, price_minor, currency')
        .in('id', renewalPlanIds)
    : {
        data: [] as Array<{
          id: string;
          name: string;
          price_minor: number | null;
          currency: string;
        }>,
      };
  const renewalPlanMap = new Map((renewalPlans ?? []).map((plan) => [plan.id, plan]));

  for (const subscription of dueRenewals ?? []) {
    if (!subscription.billing_customer_id || !subscription.billing_subscription_id) {
      logger.warn(
        { subscriptionId: subscription.id },
        'Cron: skipped WEBPAY renewal without token',
      );
      renewalFailed += 1;
      continue;
    }

    const plan = renewalPlanMap.get(subscription.plan_id);
    if (!plan || plan.price_minor == null) {
      logger.warn(
        { subscriptionId: subscription.id, planId: subscription.plan_id },
        'Cron: skipped WEBPAY renewal without plan pricing',
      );
      renewalFailed += 1;
      continue;
    }

    const period = buildNextBillingPeriod(subscription.current_period_end);
    const { data: existingRenewal } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status')
      .eq('subscription_id', subscription.id)
      .eq('provider', 'webpay')
      .eq('kind', 'subscription_renewal')
      .eq('period_start', period.periodStart)
      .eq('period_end', period.periodEnd)
      .in('status', ['pending', 'paid'])
      .maybeSingle();

    if (existingRenewal) {
      continue;
    }

    renewalAttempted += 1;
    const externalTransactionId = crypto.randomUUID();
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
        subscription_id: subscription.id,
        provider: 'webpay',
        external_transaction_id: externalTransactionId,
        status: 'pending',
        kind: 'subscription_renewal',
        amount_minor: plan.price_minor,
        currency: plan.currency,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        raw_payload: {
          renewal_for_period_end: subscription.current_period_end,
          recurring_token: subscription.billing_subscription_id,
          customer_id: subscription.billing_customer_id,
        } as unknown as Json,
      })
      .select('id')
      .single();

    if (transactionError || !transaction) {
      logger.error(
        { transactionError, subscriptionId: subscription.id },
        'Cron: failed to create renewal transaction',
      );
      renewalFailed += 1;
      continue;
    }

    try {
      const request = buildWebpayRecurringPaymentSession({
        transactionId: transaction.id,
        amountMinor: plan.price_minor,
        currency: plan.currency,
        customerReference: subscription.billing_customer_id,
        recurringToken: subscription.billing_subscription_id,
        planName: plan.name,
      });
      const response = await sendWebpayFormRequest(request.fields);
      const notification = parseWebpayNotificationPayload(response.body);

      if (notification) {
        const result = await processWebpayPaymentNotification(notification);
        if (result.ok && result.status === 'paid') {
          renewalSucceeded += 1;
        } else {
          renewalFailed += 1;
        }
      } else {
        logger.warn(
          { subscriptionId: subscription.id, status: response.status, body: response.body },
          'Cron: WEBPAY renewal response was not a payment notification',
        );
      }
    } catch (error) {
      logger.error(
        { error, subscriptionId: subscription.id },
        'Cron: WEBPAY renewal request failed',
      );
      renewalFailed += 1;
    }
  }

  // ── A: Expire overdue subscriptions ──────────────────────────────────
  // For auto_renew=true subscriptions, allow a 3-day grace period after
  // current_period_end in case a provider renewal callback is delayed.
  // For auto_renew=false (cancelled), expire as soon as the period ends.

  // A1: Expire subscriptions where auto-renewal was disabled (no grace period)
  const { data: expiredCancelled, error: cancelledError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .in('status', ['active', 'cancelled'])
    .eq('auto_renew', false)
    .lt('current_period_end', now.toISOString())
    .select('user_id');

  if (cancelledError) {
    logger.error({ error: cancelledError }, 'Cron: failed to expire non-renewing subscriptions');
  }

  // A2: Expire auto-renew subscriptions that are 3+ days overdue (payment failed)
  const gracePeriodEnd = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const { data: expiredAutoRenew, error: autoRenewError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired', auto_renew: false })
    .eq('status', 'active')
    .eq('auto_renew', true)
    .lt('current_period_end', gracePeriodEnd.toISOString())
    .select('user_id');

  if (autoRenewError) {
    logger.error({ error: autoRenewError }, 'Cron: failed to expire overdue auto-renew subs');
  }

  const expiredUserIds = [
    ...(expiredCancelled ?? []).map((r) => r.user_id),
    ...(expiredAutoRenew ?? []).map((r) => r.user_id),
  ];
  let usageDeleted = 0;

  if (expiredUserIds.length > 0) {
    // Delete usage rows so the next generation period starts fresh on re-subscribe
    const { error: usageError } = await supabaseAdmin
      .from('user_usage')
      .delete()
      .in('user_id', expiredUserIds);

    if (usageError) {
      logger.error({ error: usageError }, 'Cron: failed to delete expired user_usage rows');
    } else {
      usageDeleted = expiredUserIds.length;
    }
  }

  logger.info(
    {
      expired: expiredUserIds.length,
      usageDeleted,
      renewalAttempted,
      renewalSucceeded,
      renewalFailed,
    },
    'Cron: subscription expiry job done',
  );

  const { data: subscriptionsToUnbind } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, user_id, billing_customer_id, billing_subscription_id')
    .eq('billing_provider', 'webpay')
    .eq('auto_renew', false)
    .eq('status', 'expired')
    .not('billing_customer_id', 'is', null)
    .not('billing_subscription_id', 'is', null);

  for (const subscription of subscriptionsToUnbind ?? []) {
    try {
      const request = buildWebpayUnbindSession({
        customerReference: subscription.billing_customer_id!,
        recurringToken: subscription.billing_subscription_id!,
      });
      const response = await sendWebpayFormRequest(request.fields);
      const unbindResponse = parseWebpayUnbindResponse(response.body);

      if (!unbindResponse || unbindResponse.rc !== '0') {
        logger.warn(
          { subscriptionId: subscription.id, status: response.status, body: response.body },
          'Cron: WEBPAY unbind failed or returned unexpected payload',
        );
        continue;
      }

      const { error: clearError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          billing_subscription_id: null,
        })
        .eq('id', subscription.id);

      if (clearError) {
        logger.warn(
          { clearError, subscriptionId: subscription.id },
          'Cron: failed to clear WEBPAY token after unbind',
        );
        continue;
      }

      unbound += 1;
    } catch (error) {
      logger.warn({ error, subscriptionId: subscription.id }, 'Cron: WEBPAY unbind request failed');
    }
  }

  // ── B: Purge consumed and expired Telegram link tokens ───────────────
  // Tokens are short-lived (15 min TTL) — keep nothing older than 24 h.
  const tokenCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { error: tokenError, count: tokensDeleted } = await supabaseAdmin
    .from('telegram_link_tokens')
    .delete({ count: 'exact' })
    .or(`consumed_at.not.is.null,expires_at.lt.${tokenCutoff}`);

  if (tokenError) {
    logger.warn({ error: tokenError }, 'Cron: failed to purge telegram_link_tokens');
  } else {
    logger.info({ tokensDeleted }, 'Cron: telegram_link_tokens purged');
  }

  return NextResponse.json({
    expired: expiredUserIds.length,
    reminded: 0,
    overdueAutoRenew: renewalFailed,
    renewalAttempted,
    renewalSucceeded,
    renewalFailed,
    unbound,
    tokensDeleted: tokensDeleted ?? 0,
  });
}
