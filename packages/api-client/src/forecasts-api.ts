import { fetchJson } from './api-client';

export interface ForecastAccessResponse {
  forecastAccessUntil: string | null;
  newBalance: number;
  free: boolean;
}

export interface ForecastRegenerateResponse {
  ok: boolean;
  newBalance: number;
  free: boolean;
}

export interface DailyForecastRecord {
  id: string;
  status: string;
  rendered_content_json: {
    interpretation?: string;
    advice?: string;
    keyTheme?: string;
    moonPhase?: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
  target_start_date?: string | null;
}

export interface DailyForecastResponse {
  forecast: DailyForecastRecord | null;
  preview: boolean;
  fullAccessRequired: boolean;
  displayName?: string;
}

class ForecastsApi {
  async getDailyForecast(): Promise<DailyForecastResponse> {
    return fetchJson<DailyForecastResponse>('/api/forecasts/daily', { cache: 'no-store' });
  }

  async startGeneration(forecastId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/forecasts/${forecastId}/generate`, {
      method: 'POST',
    });
  }

  async activateAccess(): Promise<ForecastAccessResponse> {
    return fetchJson<ForecastAccessResponse>('/api/forecasts/access', {
      method: 'POST',
    });
  }

  async regenerateForecast(forecastId: string): Promise<ForecastRegenerateResponse> {
    return fetchJson<ForecastRegenerateResponse>(`/api/forecasts/${forecastId}/regenerate`, {
      method: 'POST',
    });
  }
}

export const forecastsApi = new ForecastsApi();
