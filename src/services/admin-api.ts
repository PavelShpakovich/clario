import type { PlanId } from '@/lib/subscriptions/types';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  plan: string;
  cardsPerMonth: number;
  cardsUsed: number;
  cardsRemaining: number;
  createdAt: string;
}

interface ListUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}

interface ChangePlanResponse {
  success: boolean;
  message: string;
  userId: string;
  planId: PlanId;
}

interface ToggleAdminResponse {
  success: boolean;
  message: string;
  userId: string;
  isAdmin: boolean;
}

class AdminApi {
  /**
   * Fetch paginated list of users with subscription info
   */
  async listUsers(page: number = 1, perPage: number = 20): Promise<ListUsersResponse> {
    const res = await fetch(`/api/admin/users?page=${page}&perPage=${perPage}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch users');
    }

    return data;
  }

  /**
   * Change a user's subscription plan
   */
  async changePlan(userId: string, planId: PlanId): Promise<ChangePlanResponse> {
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to change plan');
    }

    return data;
  }

  /**
   * Toggle admin status for a user
   */
  async toggleAdmin(userId: string, isAdmin: boolean): Promise<ToggleAdminResponse> {
    const res = await fetch(`/api/admin/users/${userId}/admin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle admin status');
    }

    return data;
  }
}

export const adminApi = new AdminApi();
