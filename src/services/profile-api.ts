type ProfileResponse = {
  display_name: string | null;
  timezone?: string | null;
};

class ProfileApi {
  async getProfile(noCache = false): Promise<ProfileResponse> {
    const response = await fetch('/api/profile', {
      cache: noCache ? 'no-store' : 'default',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load profile');
    }

    return (await response.json()) as ProfileResponse;
  }

  async updateDisplayName(displayName: string): Promise<ProfileResponse> {
    return this.updateProfile({ displayName });
  }

  async updateProfile(updates: {
    displayName?: string;
    timezone?: string | null;
    onboardingCompleted?: boolean;
  }): Promise<ProfileResponse> {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update profile');
    }

    return (await response.json()) as ProfileResponse;
  }

  async updatePassword(password: string): Promise<void> {
    const response = await fetch('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update password');
    }
  }

  async deleteAccount(): Promise<void> {
    const response = await fetch('/api/profile', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to delete account');
    }
  }
}

export const profileApi = new ProfileApi();
