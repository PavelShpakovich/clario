import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { IngestionError, ValidationError } from '@/lib/errors';

export class PdfExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    if (!input.buffer) {
      throw new ValidationError({ message: 'PDF extractor requires a buffer' });
    }

    // Dynamic import to keep `pdf-parse` out of the client bundle.
    const pdfModule = await import('pdf-parse');
    const pdfParse = ('default' in pdfModule ? pdfModule.default : pdfModule) as unknown as (
      buffer: Buffer,
    ) => Promise<{ text: string }>;

    let data: { text: string };
    try {
      data = await pdfParse(input.buffer);
    } catch (err) {
      throw new IngestionError({
        message: 'Failed to parse PDF',
        cause: err,
      });
    }

    const text = data.text.trim();
    if (!text) {
      throw new IngestionError({ message: 'PDF contains no extractable text' });
    }

    return { text, charCount: text.length };
  }
}
