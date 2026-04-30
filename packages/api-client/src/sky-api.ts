import { fetchJson } from './api-client';

export interface TodaySkyResponse {
  sun: string | null;
  moon: string | null;
  mercury: string | null;
}

class SkyApi {
  async getToday(): Promise<TodaySkyResponse> {
    return fetchJson<TodaySkyResponse>('/api/sky/today', { cache: 'no-store' });
  }
}

export const skyApi = new SkyApi();
