import type { Extractor, ExtractedContent, ExtractorInput } from '@/lib/ingestion/extractor';
import { IngestionError, ValidationError } from '@/lib/errors';

export class PdfExtractor implements Extractor {
  async extract(input: ExtractorInput): Promise<ExtractedContent> {
    if (!input.buffer) {
      throw new ValidationError({ message: 'PDF extractor requires a buffer' });
    }

    // Make sure we use an import compatible with Node/Next boundary
    const PDFParserModule = await import('pdf2json');
    const PDFParser = (
      'default' in PDFParserModule ? PDFParserModule.default : PDFParserModule
    ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    let text: string;
    try {
      text = await new Promise<string>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParser = new (PDFParser as any)(null, 1);

        pdfParser.on('pdfParser_dataError', (errData: { parserError?: { message?: string } }) => {
          reject(new Error(errData.parserError?.message || 'Unknown PDF parsing error'));
        });

        pdfParser.on('pdfParser_dataReady', () => {
          resolve((pdfParser.getRawTextContent() as string).trim());
        });

        pdfParser.parseBuffer(input.buffer!);
      });
    } catch (err) {
      throw new IngestionError({
        message: 'Failed to parse PDF',
        cause: err,
      });
    }

    if (!text) {
      throw new IngestionError({ message: 'PDF contains no extractable text' });
    }

    return { text, charCount: text.length };
  }
}
