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
  const routeContext = ctx as { params?: Promise<{ reportId: string }> } | undefined;
  const reportId = routeContext?.params ? (await routeContext.params).reportId : undefined;

  if (!reportId) throw new NotFoundError({ message: 'Report not found' });
  if (!uuidSchema.safeParse(reportId).success)
    throw new ValidationError({ message: 'Invalid report ID' });

  const { data: report } = await db
    .from('compatibility_reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Report not found' });

  return NextResponse.json({ report });
});

export const DELETE = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ reportId: string }> } | undefined;
  const reportId = routeContext?.params ? (await routeContext.params).reportId : undefined;

  if (!reportId) throw new NotFoundError({ message: 'Report not found' });
  if (!uuidSchema.safeParse(reportId).success)
    throw new ValidationError({ message: 'Invalid report ID' });

  const { data: report } = await db
    .from('compatibility_reports')
    .select('id')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Report not found' });

  await db.from('compatibility_reports').delete().eq('id', reportId).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
});
