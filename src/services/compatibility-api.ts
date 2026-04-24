import { fetchJson } from '@/services/api-client';

export interface CompatibilityReportSummary {
  id: string;
}

class CompatibilityApi {
  async createReport(payload: {
    primaryChartId: string;
    secondaryChartId: string;
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
