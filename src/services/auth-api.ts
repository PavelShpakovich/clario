class AuthApi {
  async resendVerificationEmail(email: string): Promise<void> {
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // The endpoint always returns 200 regardless of whether the email exists,
    // so there is no error to surface here.
  }

  async confirmPasswordReset(accessToken: string): Promise<void> {
    const response = await fetch('/api/auth/password/confirm-reset', {
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
}

export const authApi = new AuthApi();
