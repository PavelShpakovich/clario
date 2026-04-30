import { fetchJson, resolveUrl } from './api-client';

class AuthApi {
  async register(
    email: string,
    password: string,
  ): Promise<{ success: true; needsVerification: boolean }> {
    return fetchJson<{ success: true; needsVerification: boolean }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, source: 'mobile' }),
    });
  }

  async resendVerificationEmail(email: string): Promise<void> {
    await fetch(resolveUrl('/api/auth/resend-verification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'mobile' }),
    });
    // The endpoint always returns 200 regardless of whether the email exists,
    // so there is no error to surface here.
  }

  async confirmPasswordReset(accessToken: string): Promise<void> {
    const response = await fetch(resolveUrl('/api/auth/password/confirm-reset'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? 'Failed to confirm password reset');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await fetchJson<{ success: true }>('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'mobile' }),
    });
  }
}

export const authApi = new AuthApi();
