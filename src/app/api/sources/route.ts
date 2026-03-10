import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as mammoth from 'mammoth';
import PDFParser from 'pdf2json';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { DATA_SOURCE_TYPES, MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES } from '@/lib/constants';
import { supabaseAdmin } from '@/lib/supabase/admin';

const createSourceSchema = z.object({
  themeId: z.string().uuid(),
  type: z.enum(DATA_SOURCE_TYPES),
  name: z.string().min(1).max(200),
  content: z.string().optional(), // for type=text
  url: z.string().url().optional(), // for type=url
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get('themeId');

  let query = supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (themeId) query = query.eq('theme_id', themeId);

  const { data: sources, error } = await query;
  if (error) throw error;

  return NextResponse.json({ sources });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    return handleFileUpload(req, user.id);
  }

  const body = createSourceSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { themeId, type, name, content, url } = body.data;

  if (type === 'url' && !url) {
    throw new ValidationError({ message: 'url is required for type=url' });
  }
  if (type === 'text' && !content) {
    throw new ValidationError({ message: 'content is required for type=text' });
  }

  const { data: source, error } = await supabaseAdmin
    .from('data_sources')
    .insert({
      user_id: user.id,
      theme_id: themeId,
      type,
      name,
      raw_url: url ?? null,
      extracted_text: type === 'text' ? (content ?? null) : null,
      status: type === 'text' ? 'ready' : 'pending',
    })
    .select()
    .single();

  if (error ?? !source) throw error ?? new Error('Failed to create source');

  return NextResponse.json({ source }, { status: 201 });
});

async function handleFileUpload(req: Request, userId: string): Promise<NextResponse> {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const themeId = formData.get('themeId') as string | null;
  const name = formData.get('name') as string | null;
  const typeRaw = formData.get('type') as string | null;

  if (!file || !themeId || !name || !typeRaw) {
    throw new ValidationError({ message: 'file, themeId, name, and type are required' });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError({
      message: `File too large — max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`,
    });
  }

  const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES;
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError({ message: `Unsupported file type: ${file.type}` });
  }

  const type = typeRaw as 'pdf' | 'docx';
  const buffer = Buffer.from(await file.arrayBuffer());

  // For DOCX, extract text immediately
  if (type === 'docx') {
    let extractedText: string;
    try {
      extractedText = await extractDocxText(buffer);
    } catch (error) {
      throw new ValidationError({
        message: `Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new ValidationError({ message: 'No text could be extracted from the DOCX file' });
    }

    const { data: source, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        user_id: userId,
        theme_id: themeId,
        type,
        name,
        extracted_text: extractedText,
        status: 'ready',
      })
      .select()
      .single();

    if (error ?? !source) throw error ?? new Error('Failed to create source');
    return NextResponse.json({ source }, { status: 201 });
  }

  // For PDF, extract text immediately
  if (type === 'pdf') {
    let extractedText: string;
    try {
      extractedText = await extractPdfText(buffer);
    } catch (error) {
      throw new ValidationError({
        message: `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new ValidationError({ message: 'No text could be extracted from the PDF file' });
    }

    const { data: source, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        user_id: userId,
        theme_id: themeId,
        type,
        name,
        extracted_text: extractedText,
        status: 'ready',
      })
      .select()
      .single();

    if (error ?? !source) throw error ?? new Error('Failed to create source');
    return NextResponse.json({ source }, { status: 201 });
  }

  throw new ValidationError({ message: `Unknown file type: ${type}` });
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (error) {
    throw new Error(
      `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParser = new (PDFParser as any)(null, 1);

      pdfParser.on('pdfParser_dataError', (errData: { parserError?: { message?: string } }) => {
        reject(new Error(errData.parserError?.message || 'Unknown PDF parsing error'));
      });

      pdfParser.on('pdfParser_dataReady', () => {
        const text = pdfParser.getRawTextContent();
        resolve(text.trim());
      });

      pdfParser.parseBuffer(buffer);
    } catch (error) {
      reject(error);
    }
  });
}
