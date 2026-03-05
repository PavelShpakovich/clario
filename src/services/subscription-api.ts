/**
 * API client for subscription operations on the client side
 * Pure fetch wrapper for subscription endpoints
 */

export interface GetSubscriptionResponse {
  planId: 'free' | 'pro' | 'unlimited';
  cardsPerMonth: number;
  cardsRemaining: number;
  status: 'active' | 'canceled' | 'expired';
  currentPeriodEnd: string;
}

class SubscriptionApiClient {
  /**
   * Get user's subscription info
   */
  async getSubscription(): Promise<GetSubscriptionResponse> {
    const res = await fetch('/api/subscription', {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to fetch subscription');
    }

    return (await res.json()) as GetSubscriptionResponse;
  }

  /**
   * Request plan upgrade
   */
  async requestUpgrade(
    planId: 'basic' | 'pro' | 'unlimited',
  ): Promise<{ status: string; message: string }> {
    const res = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to request upgrade');
    }

    return (await res.json()) as { status: string; message: string };
  }

  /**
   * Get subscription management info
   */
  async getManagementInfo(): Promise<{ plan: string; supportEmail: string; message: string }> {
    const res = await fetch('/api/subscription/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to get management info');
    }

    return (await res.json()) as { plan: string; supportEmail: string; message: string };
  }
}

export const subscriptionApi = new SubscriptionApiClient();
