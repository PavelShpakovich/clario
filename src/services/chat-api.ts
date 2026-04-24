import { ApiClientError, readJsonResponse } from '@/services/api-client';

export interface UnlockFollowUpResponse {
  messagesLimit: number;
  addedMessages: number;
  newBalance: number;
}

class ChatApi {
  async streamAssistantReply(options: {
    readingId: string;
    message: string;
    signal?: AbortSignal;
    onChunk: (content: string) => void;
  }): Promise<void> {
    const response = await fetch(`/api/chat/${options.readingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: options.message }),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      const data = await readJsonResponse<{ error?: string }>(response);
      throw new ApiClientError(data?.error ?? 'Error', response.status, data ?? undefined);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      options.onChunk(accumulated);
    }
  }

  async unlockFollowUp(readingId: string): Promise<UnlockFollowUpResponse> {
    const response = await fetch(`/api/chat/${readingId}/unlock`, { method: 'POST' });
    const data = await readJsonResponse<
      UnlockFollowUpResponse & { error?: string; required?: number; balance?: number }
    >(response);

    if (!response.ok) {
      throw new ApiClientError(data?.error ?? 'Request failed', response.status, data ?? undefined);
    }

    if (!data) {
      throw new ApiClientError('Invalid server response', response.status);
    }

    return data;
  }
}

export const chatApi = new ChatApi();
