import { fetchJson } from './api-client';
import type { CompatibilityType } from '@clario/types';

export interface CompatibilityReportSummary {
  id: string;
}

export interface CompatibilityReport {
  id: string;
  primary_chart_id: string;
  secondary_chart_id: string;
  primary_person_name?: string | null;
  secondary_person_name?: string | null;
  harmony_score?: number | null;
  compatibility_type: string;
  status: string;
  title: string | null;
  error_message: string | null;
  rendered_content_json: {
    harmonyScore?: number;
    title?: string;
    summary?: string;
    keyAspects?: Array<{
      bodyA: string;
      bodyB: string;
      aspectKey: string;
      orbDecimal: number;
      score: number;
      headline: string;
      body: string;
    }>;
    sections?: Array<{ key: string; title: string; content: string }>;
    placementHighlights?: string[];
    advice?: string[];
    disclaimers?: string[];
    [key: string]: unknown;
  } | null;
  created_at: string;
}

class CompatibilityApi {
  async listReports(): Promise<{ reports: CompatibilityReport[] }> {
    const data = await fetchJson<{ reports?: CompatibilityReport[] }>('/api/compatibility', {
      cache: 'no-store',
    });
    return { reports: data.reports ?? [] };
  }

  async getReport(reportId: string): Promise<{ report: CompatibilityReport }> {
    return fetchJson<{ report: CompatibilityReport }>(`/api/compatibility/${reportId}`);
  }

  async createReport(payload: {
    primaryChartId: string;
    secondaryChartId: string;
    compatibilityType?: CompatibilityType;
  }): Promise<{ report: CompatibilityReportSummary }> {
    return fetchJson<{ report: CompatibilityReportSummary }>('/api/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async startGeneration(reportId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/compatibility/${reportId}/generate`, { method: 'POST' });
  }

  async resetForRetry(reportId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/compatibility/${reportId}/retry`, { method: 'POST' });
  }

  async deleteReport(reportId: string): Promise<void> {
    await fetchJson<{ ok: true }>(`/api/compatibility/${reportId}`, { method: 'DELETE' });
  }
}

export const compatibilityApi = new CompatibilityApi();
