import { fetchJson } from './api-client';

export interface CalendarDay {
  date: string;
  sunSign: string | null;
  moonSign: string | null;
  sunDeg: number | null;
  moonDeg: number | null;
  phase:
    | 'new'
    | 'crescent'
    | 'first-quarter'
    | 'gibbous'
    | 'full'
    | 'waning-gibbous'
    | 'last-quarter'
    | 'waning-crescent'
    | null;
}

export interface CalendarResponse {
  days: CalendarDay[];
}

class CalendarApi {
  async getCalendar(): Promise<CalendarResponse> {
    return fetchJson<CalendarResponse>('/api/calendar');
  }
}

export const calendarApi = new CalendarApi();
