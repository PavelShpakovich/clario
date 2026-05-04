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

  async verifyOtp(email: string, otp: string): Promise<{ success: true }> {
    return fetchJson<{ success: true }>('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await fetchJson<{ success: true }>('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'mobile' }),
    });
  }

  async verifyPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<{ success: true; resetToken: string }> {
    return fetchJson<{ success: true; resetToken: string }>('/api/auth/password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
  }

  async updatePassword(resetToken: string, newPassword: string): Promise<{ success: true }> {
    return fetchJson<{ success: true }>('/api/auth/password/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword }),
    });
  }
}

export const authApi = new AuthApi();
