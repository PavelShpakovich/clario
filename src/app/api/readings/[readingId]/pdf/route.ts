import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ReadingPdfDocument } from '@/components/pdf/reading-pdf';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();

interface ReadingContentJson {
  title?: string;
  summary?: string;
  sections?: Array<{ key: string; title: string; content: string }>;
  advice?: string[];
  disclaimers?: string[];
}

const READING_TYPE_LABELS: Record<string, string> = {
  natal_overview: 'Натальный обзор',
  personality: 'Личность',
  love: 'Любовь и отношения',
  career: 'Карьера',
  strengths: 'Сильные стороны',
  transit: 'Транзиты',
};

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  const { data: reading } = await db
    .from('readings')
    .select('*')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });
  if (reading.status !== 'ready') {
    return NextResponse.json({ error: 'Reading is not ready yet' }, { status: 400 });
  }

  const content = (reading.rendered_content_json ?? {}) as ReadingContentJson;
  const typeLabel = READING_TYPE_LABELS[reading.reading_type] ?? reading.reading_type;
  const createdAt = new Date(reading.created_at).toLocaleDateString('ru', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pdfBuffer = await renderToBuffer(
    React.createElement(ReadingPdfDocument, {
      title: reading.title,
      typeLabel,
      createdAt,
      summary: reading.summary ?? content.summary,
      sections: content.sections,
      advice: content.advice,
      disclaimers: content.disclaimers,
    }),
  );

  const safeTitle = reading.title
    .replace(/[^a-zA-Zа-яА-Я0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const asciiFilename = `clario-reading.pdf`;
  const utfFilename = `clario-${safeTitle}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utfFilename)}`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
});
