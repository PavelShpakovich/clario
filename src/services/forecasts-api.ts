import { fetchJson } from '@/services/api-client';

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

class ForecastsApi {
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
