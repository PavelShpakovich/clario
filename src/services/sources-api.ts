import type { Database } from '@/lib/supabase/types';

type DataSource = Database['public']['Tables']['data_sources']['Row'];

interface CreateSourceInput {
  themeId: string;
  type: 'text' | 'url' | 'youtube';
  name: string;
  content?: string;
  url?: string;
}

class SourcesApi {
  async list(themeId: string): Promise<DataSource[]> {
    const res = await fetch(`/api/sources?themeId=${themeId}`);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to fetch sources');
    }

    const data = (await res.json()) as { sources?: DataSource[] };
    return data.sources || [];
  }

  async create(input: CreateSourceInput): Promise<DataSource> {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to create source');
    }

    const data = (await res.json()) as { source?: DataSource };
    if (!data.source) throw new Error('Failed to create source');

    return data.source;
  }

  async uploadFile(themeId: string, file: File): Promise<DataSource> {
    const formData = new FormData();
    formData.append('themeId', themeId);
    formData.append('file', file);
    formData.append('name', file.name);

    const fileType = file.type.includes('wordprocessingml') ? 'docx' : 'pdf';
    formData.append('type', fileType);

    const res = await fetch('/api/sources', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to upload file');
    }

    const data = (await res.json()) as { source?: DataSource };
    if (!data.source) throw new Error('Failed to upload file');

    return data.source;
  }

  async process(sourceId: string): Promise<void> {
    const res = await fetch(`/api/sources/${sourceId}/process`, { method: 'POST' });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to process source');
    }
  }

  async remove(sourceId: string): Promise<void> {
    const res = await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to delete source');
    }
  }
}

export const sourcesApi = new SourcesApi();
