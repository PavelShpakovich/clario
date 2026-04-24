import type { ReadingType } from '@/lib/astrology/types';
import { fetchJson } from '@/services/api-client';

export interface ReadingSummary {
  id: string;
}

class ReadingsApi {
  async createReading(payload: {
    chartId: string;
    readingType: ReadingType | string;
    replaceReadingId?: string;
  }): Promise<{ reading: ReadingSummary }> {
    return fetchJson<{ reading: ReadingSummary }>('/api/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async startGeneration(readingId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/readings/${readingId}/generate`, { method: 'POST' });
  }

  async resetForRetry(readingId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/readings/${readingId}/retry`, { method: 'POST' });
  }

  async deleteReading(readingId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/readings/${readingId}`, { method: 'DELETE' });
  }
}

export const readingsApi = new ReadingsApi();
