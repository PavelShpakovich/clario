import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { IngestionError, ValidationError } from '@/lib/errors';

const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';

// Matches full <text> element including nested tags (e.g. <s>, <c> auto-caption timing tags)
const RE_XML_TRANSCRIPT = /<text[^>]*>([\s\S]*?)<\/text>/g;
// Strips inner HTML formatting tags from the captured content
const RE_INNER_TAGS = /<[^>]+>/g;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function extractVideoId(url: string): string {
  const match = YOUTUBE_ID_REGEX.exec(url);
  if (!match?.[1]) {
    throw new ValidationError({
      message: 'Could not extract YouTube video ID from the provided URL',
      context: { url },
    });
  }
  return match[1];
}

export class YoutubeExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    if (!input.url) {
      throw new ValidationError({ message: 'YouTube extractor requires a url' });
    }

    const videoId = extractVideoId(input.url);

    // Step 1: Fetch YouTube watch page to get the captions track list
    let videoPageBody: string;
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      videoPageBody = await res.text();
    } catch (err) {
      throw new IngestionError({
        message: 'Failed to reach YouTube — check your network connection',
        cause: err,
        context: { videoId },
      });
    }

    if (videoPageBody.includes('class="g-recaptcha"')) {
      throw new IngestionError({
        message: 'YouTube is rate-limiting requests — please try again later',
        context: { videoId },
      });
    }

    // Step 2: Extract captions track base URL from embedded page JSON
    const captionsParts = videoPageBody.split('"captions":');
    if (captionsParts.length <= 1) {
      throw new IngestionError({
        message: 'Captions are disabled or unavailable for this video',
        context: { videoId },
      });
    }

    let captionTrackUrl: string;
    try {
      const captionsJson = captionsParts[1].split(',"videoDetails')[0].replace(/\n/g, '');
      const captions = JSON.parse(captionsJson) as {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{ baseUrl: string; languageCode: string }>;
        };
      };
      const tracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks?.length) throw new Error('empty captionTracks');
      captionTrackUrl = tracks[0].baseUrl;
    } catch {
      throw new IngestionError({
        message: 'No transcript available for this video — captions may be disabled',
        context: { videoId },
      });
    }

    // Step 3: Fetch the raw XML transcript
    let transcriptXml: string;
    try {
      const res = await fetch(captionTrackUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      transcriptXml = await res.text();
    } catch (err) {
      throw new IngestionError({
        message: 'Failed to download transcript for this video',
        cause: err,
        context: { videoId },
      });
    }

    // Step 4: Parse XML — strip inner formatting tags (<s>, <c>, etc.) and decode HTML entities.
    // The youtube-transcript library uses [^<]* which silently drops everything when YouTube
    // wraps caption text in nested tags (auto-generated captions). This handles both formats.
    const matches = [...transcriptXml.matchAll(RE_XML_TRANSCRIPT)];
    const text = matches
      .map((m) => decodeHtmlEntities(m[1].replace(RE_INNER_TAGS, '')))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      throw new IngestionError({
        message: 'YouTube transcript is empty — the video may have no spoken content',
        context: { videoId },
      });
    }

    return { text, charCount: text.length };
  }
}
