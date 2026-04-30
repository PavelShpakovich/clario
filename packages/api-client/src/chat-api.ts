import { ApiClientError, getAuthHeaders, readJsonResponse, resolveUrl } from './api-client';

export interface UnlockFollowUpResponse {
  messagesLimit: number;
  addedMessages: number;
  newBalance: number;
}

export interface ChatThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatThreadResponse {
  threadId: string;
  messages: ChatThreadMessage[];
  messagesUsed: number;
  messagesLimit: number;
}

class ChatApi {
  async getThread(readingId: string): Promise<ChatThreadResponse> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(resolveUrl(`/api/chat/${readingId}`), {
      method: 'GET',
      headers: authHeaders,
    });
    const data = await readJsonResponse<ChatThreadResponse & { error?: string }>(response);
    if (!response.ok) {
      throw new ApiClientError(data?.error ?? 'Request failed', response.status, data ?? undefined);
    }
    if (!data) throw new ApiClientError('Invalid server response', response.status);
    return data;
  }

  async streamAssistantReply(options: {
    readingId: string;
    message: string;
    signal?: AbortSignal;
    onChunk: (content: string) => void;
  }): Promise<void> {
    // Use XMLHttpRequest for streaming — React Native's fetch does not expose
    // response.body as a readable stream, so onprogress is the reliable cross-platform approach.
    const authHeaders = await getAuthHeaders();

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', resolveUrl(`/api/chat/${options.readingId}`));
      xhr.setRequestHeader('Content-Type', 'application/json');
      for (const [key, value] of Object.entries(authHeaders)) {
        xhr.setRequestHeader(key, value);
      }

      let lastIndex = 0;

      xhr.onprogress = () => {
        const full = xhr.responseText;
        if (full.length > lastIndex) {
          lastIndex = full.length;
          options.onChunk(full);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Deliver any text not yet flushed via onprogress
          if (xhr.responseText.length > lastIndex) {
            options.onChunk(xhr.responseText);
          }
          resolve();
        } else {
          let errorMsg = 'Error';
          try {
            const data = JSON.parse(xhr.responseText) as { error?: string };
            if (data?.error) errorMsg = data.error;
          } catch {
            /* ignore */
          }
          reject(new ApiClientError(errorMsg, xhr.status));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
          const err = new Error('AbortError');
          err.name = 'AbortError';
          reject(err);
        });
      }

      xhr.send(JSON.stringify({ message: options.message }));
    });
  }

  async unlockFollowUp(readingId: string): Promise<UnlockFollowUpResponse> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(resolveUrl(`/api/chat/${readingId}/unlock`), {
      method: 'POST',
      headers: authHeaders,
    });
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
