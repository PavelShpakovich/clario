import type { HouseSystem } from '@clario/types';
import { fetchJson } from './api-client';

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
  notes?: string | null;
  created_at: string;
  updated_at: string;
  big_three?: { sun?: string; moon?: string; asc?: string } | null;
};

export type ChartPosition = {
  id: string;
  chart_snapshot_id: string;
  body_key: string;
  sign_key: string;
  degree_decimal: number;
  house_number: number | null;
  retrograde: boolean;
};

export type ChartDetail = {
  chart: ChartRecord;
  snapshots: Array<{ id: string; snapshot_version: number; created_at: string }>;
  positions: ChartPosition[];
  aspects: Array<{
    id: string;
    chart_snapshot_id: string;
    body_a: string;
    body_b: string;
    aspect_key: string;
    orb_decimal: number;
    applying: boolean | null;
  }>;
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
    const data = await fetchJson<{ charts?: ChartRecord[] }>('/api/charts', {
      cache: 'no-store',
    });
    return { charts: data.charts ?? [] };
  }

  async getChart(chartId: string): Promise<ChartDetail> {
    return fetchJson<ChartDetail>(`/api/charts/${chartId}`);
  }

  async createChart(payload: ChartCreatePayload): Promise<{ chart: ChartRecord }> {
    return fetchJson<{ chart: ChartRecord }>('/api/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updateChart(chartId: string, payload: ChartUpdatePayload): Promise<{ chart: ChartRecord }> {
    return fetchJson<{ chart: ChartRecord }>(`/api/charts/${chartId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async deleteChart(chartId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/charts/${chartId}`, { method: 'DELETE' });
  }

  async listChartReadings(
    chartId: string,
    page: number,
    pageSize: number,
  ): Promise<{ readings: ChartReadingRow[]; total: number; page: number }> {
    return fetchJson<{ readings: ChartReadingRow[]; total: number; page: number }>(
      `/api/charts/${chartId}/readings?page=${page}&pageSize=${pageSize}`,
      { cache: 'no-store' },
    );
  }
}

export type ChartReadingRow = {
  id: string;
  title: string;
  reading_type: string;
  status: string;
  created_at: string;
  summary: string | null;
};

export const chartsApi = new ChartsApi();
