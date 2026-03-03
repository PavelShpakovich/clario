'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Database } from '@/lib/supabase/types';
import { sourcesApi } from '@/services/sources-api';

type DataSource = Database['public']['Tables']['data_sources']['Row'];

/**
 * Hook to manage data source uploads and processing status
 *
 * @example
 * const { sources, uploadText, uploadUrl, uploadFile, isUploading } = useSourceUpload(themeId);
 * return (
 *   <>
 *     {sources.map(source => (
 *       <SourceItem key={source.id} source={source} />
 *     ))}
 *     <UploadForm onUpload={uploadText} />
 *   </>
 * );
 */
export function useSourceUpload(themeId: string) {
  const { data: session } = useSession();

  const [sources, setSources] = useState<DataSource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    const sources = await sourcesApi.list(themeId);
    setSources(sources);
    return sources;
  }, [themeId]);

  // Fetch existing sources on mount
  useEffect(() => {
    const loadSources = async () => {
      try {
        await fetchSources();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sources');
      }
    };

    if (session?.user?.id) {
      void loadSources();
    }
  }, [session?.user?.id, fetchSources]);

  // Poll while any source is pending/processing
  useEffect(() => {
    const hasActiveSources = sources.some((source) =>
      ['pending', 'processing'].includes(source.status),
    );

    if (!session?.user?.id || !hasActiveSources) return;

    const timer = setInterval(() => {
      void fetchSources().catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to refresh sources');
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [session?.user?.id, sources, fetchSources]);

  const uploadText = useCallback(
    async (text: string, name?: string) => {
      try {
        setIsUploading(true);
        setError(null);

        const source = await sourcesApi.create({
          themeId,
          type: 'text',
          name: name || 'Pasted Text',
          content: text,
        });
        setSources((prev) => [source, ...prev]);
        return source;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload text';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [themeId],
  );

  const uploadUrl = useCallback(
    async (url: string, name?: string) => {
      try {
        setIsUploading(true);
        setError(null);

        const sourceType =
          url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'url';

        const source = await sourcesApi.create({
          themeId,
          type: sourceType,
          name: name || (sourceType === 'youtube' ? 'YouTube Source' : 'Web Source'),
          url,
        });

        setSources((prev) => [source, ...prev]);
        await sourcesApi.process(source.id);
        await fetchSources();
        return source;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add URL source';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [themeId, fetchSources],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        setError(null);

        const source = await sourcesApi.uploadFile(themeId, file);
        setSources((prev) => [source, ...prev]);
        await sourcesApi.process(source.id);
        await fetchSources();
        return source;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload file';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [themeId, fetchSources],
  );

  const deleteSource = useCallback(async (sourceId: string) => {
    try {
      await sourcesApi.remove(sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete source';
      setError(message);
      throw err;
    }
  }, []);

  return {
    sources,
    isUploading,
    error,
    uploadText,
    uploadUrl,
    uploadFile,
    deleteSource,
  };
}
