import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { InsufficientCreditsError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getFreeProducts, getProductPricing } from '@/lib/credits/pricing';
import type { ProductKind } from '@/lib/credits/pricing';

const db = supabaseAdmin;

// ─── Types ──────────────────────────────────────────────────────────────────

export type CreditReason =
  | 'pack_purchase'
  | 'admin_grant'
  | 'admin_revoke'
  | 'reading_debit'
  | 'compatibility_debit'
  | 'forecast_pack_debit'
  | 'chat_pack_debit'
  | 'refund_llm_failure'
  | 'refund_admin'
  | 'welcome_bonus';

export type ReferenceType =
  | 'reading'
  | 'compatibility_report'
  | 'forecast'
  | 'follow_up'
  | 'purchase';

export interface CreditBalance {
  balance: number;
  forecastAccessUntil: Date | null;
}

export interface CreditMutationOpts {
  referenceType?: ReferenceType;
  referenceId?: string;
  note?: string;
}

export interface CreditMutationResult {
  newBalance: number;
  transactionId: string;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getBalance(userId: string): Promise<CreditBalance> {
  const { data, error } = await db
    .from('user_credits')
    .select('balance, forecast_access_until')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return {
    balance: data?.balance ?? 0,
    forecastAccessUntil: data?.forecast_access_until ? new Date(data.forecast_access_until) : null,
  };
}

// ─── Add credits ────────────────────────────────────────────────────────────

export async function addCredits(
  userId: string,
  amount: number,
  reason: CreditReason,
  opts: CreditMutationOpts = {},
): Promise<CreditMutationResult> {
  const { data, error } = await db.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference_type: opts.referenceType ?? undefined,
    p_reference_id: opts.referenceId ?? undefined,
    p_note: opts.note ?? undefined,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;

  logger.info({ userId, amount, reason, newBalance: row.new_balance }, 'Credits added');

  return {
    newBalance: row.new_balance,
    transactionId: row.transaction_id,
  };
}

// ─── Deduct credits ─────────────────────────────────────────────────────────

export async function deductCredits(
  userId: string,
  amount: number,
  reason: CreditReason,
  opts: CreditMutationOpts = {},
): Promise<CreditMutationResult> {
  const { data, error } = await db.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference_type: opts.referenceType ?? undefined,
    p_reference_id: opts.referenceId ?? undefined,
    p_note: opts.note ?? undefined,
  });

  if (error) {
    // Parse the structured error from the Postgres function
    const msg = error.message ?? '';
    if (msg.includes('INSUFFICIENT_CREDITS')) {
      const parts = msg.split(':');
      const currentBalance = parseInt(parts[1], 10) || 0;
      throw new InsufficientCreditsError({
        message: `Insufficient credits: have ${currentBalance}, need ${amount}`,
        context: { userId, balance: currentBalance, required: amount },
      });
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  logger.info({ userId, amount, reason, newBalance: row.new_balance }, 'Credits deducted');

  return {
    newBalance: row.new_balance,
    transactionId: row.transaction_id,
  };
}

// ─── Refund credits ─────────────────────────────────────────────────────────

export async function refundCredits(
  userId: string,
  amount: number,
  reason: 'refund_llm_failure' | 'refund_admin',
  opts: CreditMutationOpts = {},
): Promise<CreditMutationResult> {
  return addCredits(userId, amount, reason, opts);
}

// ─── Charge for product (unified) ───────────────────────────────────────────

const PRODUCT_REASON: Record<ProductKind, CreditReason> = {
  natal_report: 'reading_debit',
  compatibility_report: 'compatibility_debit',
  forecast_report: 'forecast_pack_debit',
  follow_up_pack: 'chat_pack_debit',
};

const PRODUCT_REF_TYPE: Record<ProductKind, ReferenceType> = {
  natal_report: 'reading',
  compatibility_report: 'compatibility_report',
  forecast_report: 'forecast',
  follow_up_pack: 'follow_up',
};

export interface ChargeResult {
  charged: boolean;
  free: boolean;
  newBalance: number;
  transactionId?: string;
}

/**
 * Unified credit charge for any product.
 * Checks the free-product flag first; if free, skips deduction.
 * Throws `InsufficientCreditsError` when credits are insufficient.
 */
export async function chargeForProduct(
  userId: string,
  kind: ProductKind,
  opts: { referenceId?: string } = {},
): Promise<ChargeResult> {
  const { cost, isFree } = await getProductPricing(kind);

  if (isFree) {
    const { balance } = await getBalance(userId);
    return { charged: false, free: true, newBalance: balance };
  }

  const result = await deductCredits(userId, cost, PRODUCT_REASON[kind], {
    referenceType: PRODUCT_REF_TYPE[kind],
    referenceId: opts.referenceId,
  });

  return {
    charged: true,
    free: false,
    newBalance: result.newBalance,
    transactionId: result.transactionId,
  };
}

// ─── Forecast access ────────────────────────────────────────────────────────

export async function activateForecastAccess(
  userId: string,
  creditCost: number,
): Promise<{ forecastAccessUntil: Date | null; newBalance: number; free: boolean }> {
  const freeProducts = await getFreeProducts();
  if (freeProducts.has('forecast_report')) {
    // Free product — return current balance without touching credits
    const { balance } = await getBalance(userId);
    return { forecastAccessUntil: null, newBalance: balance, free: true };
  }

  // Deduct credits first
  const result = await deductCredits(userId, creditCost, 'forecast_pack_debit', {
    referenceType: 'forecast',
  });

  // Determine new expiry: extend from current expiry if still active, otherwise from now
  const { forecastAccessUntil: currentExpiry } = await getBalance(userId);
  const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + 1);

  const { error } = await db
    .from('user_credits')
    .update({
      forecast_access_until: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;

  return {
    forecastAccessUntil: newExpiry,
    newBalance: result.newBalance,
    free: false,
  };
}

export async function hasForecastAccess(userId: string): Promise<boolean> {
  const freeProducts = await getFreeProducts();
  if (freeProducts.has('forecast_report')) return true;
  const { forecastAccessUntil } = await getBalance(userId);
  return forecastAccessUntil !== null && forecastAccessUntil > new Date();
}
