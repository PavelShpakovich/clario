import { fetchJson } from '@/services/api-client';

class FeedbackApi {
  async submitFeedback(message: string): Promise<void> {
    await fetchJson<{ ok: true }>('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  }
}

export const feedbackApi = new FeedbackApi();
