/**
 * Client-side service for subscription management.
 *
 * All methods call the /api/profile/telegram-subscription endpoints.
 * NOTE: DELETE cancels **auto-renewal** only — the subscription stays active
 * until the current period ends, then expires.
 */

class SubscriptionApi {
  /**
   * Creates a Telegram Stars invoice link for the given plan.
   * Must be called inside a Telegram Mini App context.
   */
  async createInvoiceLink(planId: string, starsPrice: number): Promise<string> {
    const response = await fetch('/api/telegram/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, starsPrice }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to create invoice');
    }

    const { invoiceLink } = (await response.json()) as { invoiceLink: string };
    return invoiceLink;
  }

  /**
   * Cancels auto-renewal for the current subscription.
   * The subscription remains active until current_period_end.
   */
  async cancelRenewal(): Promise<void> {
    const response = await fetch('/api/profile/telegram-subscription', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to cancel renewal');
    }
  }

  /**
   * Re-enables auto-renewal for a subscription where it was previously disabled.
   */
  async reEnableRenewal(): Promise<void> {
    const response = await fetch('/api/profile/telegram-subscription', {
      method: 'PATCH',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to re-enable renewal');
    }
  }
}

export const subscriptionApi = new SubscriptionApi();
