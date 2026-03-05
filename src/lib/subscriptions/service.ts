import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import type { UserPlanInfo, UserUsageInfo, SubscriptionResponse, PlanId } from './types';

/**
 * Subscription and usage management service
 * Handles plan queries, usage tracking, and limit enforcement
 */
export class SubscriptionService {
  /**
   * Get user's active subscription plan
   */
  static async getUserPlan(userId: string): Promise<UserPlanInfo> {
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select(
        `
        id,
        plan_id,
        status,
        current_period_end,
        subscription_plans!inner(cards_per_month)
      `,
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      // Default to free plan with 20 cards/month
      return {
        planId: 'free',
        cardsPerMonth: 20,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    return {
      planId: data.plan_id as 'free' | 'basic' | 'pro' | 'unlimited',
      cardsPerMonth: (data.subscription_plans as unknown as { cards_per_month: number })
        .cards_per_month,
      status: data.status as 'active' | 'canceled' | 'expired',
      currentPeriodEnd: data.current_period_end,
    };
  }

  /**
   * Get user's current usage for the active billing period.
   * READ-ONLY — never writes to user_usage (avoids UPSERT resetting cards_generated).
   * Record creation happens atomically inside incrementCardCount via the DB RPC.
   */
  static async getUserUsage(userId: string): Promise<UserUsageInfo> {
    const now = new Date();

    // Use limit(1) + order instead of .single() to avoid PGRST116 errors
    // when 0 or multiple rows exist (both cause .single() to throw).
    const { data: rows, error } = await supabaseAdmin
      .from('user_usage')
      .select('cards_generated, cards_limit, period_end')
      .eq('user_id', userId)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error({ error, userId }, 'getUserUsage: DB error');
    }

    const data = rows?.[0] ?? null;

    if (!data) {
      // No active period yet — return plan defaults.
      // The record will be created on first card generation via the atomic RPC.
      const plan = await this.getUserPlan(userId);
      return {
        cardsGenerated: 0,
        cardsLimit: plan.cardsPerMonth,
        cardsRemaining: plan.cardsPerMonth,
        periodEnd: plan.currentPeriodEnd,
      };
    }

    return {
      cardsGenerated: data.cards_generated ?? 0,
      cardsLimit: data.cards_limit,
      cardsRemaining: Math.max(0, data.cards_limit - (data.cards_generated ?? 0)),
      periodEnd: data.period_end,
    };
  }

  /**
   * Get full subscription status
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionResponse> {
    const plan = await this.getUserPlan(userId);
    const usage = await this.getUserUsage(userId);

    return {
      plan,
      usage,
      canGenerate: usage.cardsRemaining > 0,
    };
  }

  /**
   * Check if user can generate N cards
   */
  static async canGenerateCards(userId: string, cardCount: number): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    return status.usage.cardsRemaining >= cardCount;
  }

  /**
   * Atomically increment card generation count via a PostgreSQL function.
   * The DB function handles find-or-create in a single operation,
   * preventing both duplicates and lost updates from concurrent requests.
   */
  static async incrementCardCount(userId: string, count: number): Promise<void> {
    const { error } = await supabaseAdmin.rpc('increment_card_usage', {
      p_user_id: userId,
      p_count: count,
    });

    if (error) {
      logger.error({ error, userId, count }, 'Failed to increment card usage via RPC');
      throw new Error(`Failed to track card usage: ${error.message}`);
    }
  }

  /**
   * Create subscription for new user (defaults to free)
   */
  static async initializeUserSubscription(userId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('user_subscriptions').insert({
      user_id: userId,
      plan_id: 'free',
      status: 'active',
    });

    if (error) {
      console.error('Failed to initialize subscription:', error);
    }
  }

  /**
   * Upgrade or downgrade user's plan
   * Starts a new billing period from the moment of tier change
   */
  static async changePlan(userId: string, newPlanId: PlanId): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update subscription and reset period
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        plan_id: newPlanId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to change plan: ${error.message}`);
    }

    // Create new usage period starting NOW (when tier changes)
    const { data: planData } = await supabaseAdmin
      .from('subscription_plans')
      .select('cards_per_month')
      .eq('id', newPlanId)
      .single();

    const cardsPerMonth = (planData as Record<string, number> | null)?.cards_per_month ?? 20;

    // Delete old usage records for clean slate
    await supabaseAdmin.from('user_usage').delete().eq('user_id', userId);

    // Create new period starting from tier change date
    await supabaseAdmin.from('user_usage').insert({
      user_id: userId,
      cards_generated: 0,
      cards_limit: cardsPerMonth,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
    });
  }

  /**
   * Cancel user's subscription
   */
  static async cancelSubscription(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }
}
