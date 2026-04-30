import { fetchJson } from './api-client';

export interface UserPreferencesResponse {
  tone_style: string;
  content_focus_love: boolean;
  content_focus_career: boolean;
  content_focus_growth: boolean;
  allow_spiritual_tone: boolean;
}

export interface UpdatePreferencesPayload {
  toneStyle?: string;
  contentFocusLove?: boolean;
  contentFocusCareer?: boolean;
  contentFocusGrowth?: boolean;
  allowSpiritualTone?: boolean;
}

class PreferencesApi {
  async getPreferences(): Promise<UserPreferencesResponse> {
    return fetchJson<UserPreferencesResponse>('/api/preferences', { cache: 'no-store' });
  }

  async updatePreferences(payload: UpdatePreferencesPayload): Promise<UserPreferencesResponse> {
    return fetchJson<UserPreferencesResponse>('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}

export const preferencesApi = new PreferencesApi();
