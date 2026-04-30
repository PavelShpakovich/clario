import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  const { data: reading } = await db
    .from('readings')
    .select(
      'id, chart_id, reading_type, title, summary, status, error_message, created_at, rendered_content_json',
    )
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });

  const { data: sections } = await db
    .from('reading_sections')
    .select('id, section_key, title, content, sort_order')
    .eq('reading_id', readingId)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    status: reading.status, // backward compat for web status poller
    reading: {
      ...reading,
      reading_sections: sections ?? [],
    },
  });
});

export const DELETE = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  const { data: reading } = await db
    .from('readings')
    .select('id')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });

  await db.from('readings').delete().eq('id', readingId).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
});
