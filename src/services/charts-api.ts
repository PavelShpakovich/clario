import type { HouseSystem } from '@/lib/astrology/constants';

export type ChartRecord = {
  id: string;
  label: string;
  person_name: string;
  subject_type: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_known: boolean;
  timezone: string | null;
  city: string;
  country: string;
  house_system: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ChartUpdatePayload = {
  label: string;
  personName: string;
  subjectType: 'self' | 'partner' | 'child' | 'client' | 'other';
  birthDate: string;
  birthTime: string | null;
  birthTimeKnown: boolean;
  city: string;
  country: string;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  houseSystem: HouseSystem;
  notes: string | null;
};

export type ChartCreatePayload = {
  label: string;
  personName: string;
  subjectType: 'self' | 'partner' | 'child' | 'client' | 'other';
  birthDate: string;
  birthTime?: string;
  birthTimeKnown: boolean;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  houseSystem: HouseSystem;
  notes?: string;
  locale?: 'en' | 'ru';
};

class ChartsApi {
  async listCharts(): Promise<{ charts: ChartRecord[] }> {
    const response = await fetch('/api/charts', { cache: 'no-store' });
    const data = (await response.json()) as {
      charts?: ChartRecord[];
      error?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to load charts');
    }

    return { charts: data.charts ?? [] };
  }

  async createChart(payload: ChartCreatePayload): Promise<{ chart: ChartRecord }> {
    const response = await fetch('/api/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      chart?: ChartRecord;
      error?: string;
      message?: string;
    };

    if (response.status === 429) {
      throw new Error('rate_limit');
    }
    if (!response.ok || !data.chart) {
      throw new Error(data.error || data.message || 'Failed to create chart');
    }

    return { chart: data.chart };
  }

  async updateChart(chartId: string, payload: ChartUpdatePayload): Promise<{ chart: ChartRecord }> {
    const response = await fetch(`/api/charts/${chartId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      chart?: ChartRecord;
      error?: string;
      message?: string;
    };

    if (!response.ok || !data.chart) {
      throw new Error(data.error || data.message || 'Failed to update chart');
    }

    return { chart: data.chart };
  }

  async deleteChart(chartId: string): Promise<void> {
    const response = await fetch(`/api/charts/${chartId}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to delete chart');
    }
  }
}

export const chartsApi = new ChartsApi();
