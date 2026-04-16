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
  const routeContext = ctx as { params?: Promise<{ forecastId: string }> } | undefined;
  const forecastId = routeContext?.params ? (await routeContext.params).forecastId : undefined;

  if (!forecastId) throw new NotFoundError({ message: 'Forecast not found' });
  if (!uuidSchema.safeParse(forecastId).success)
    throw new ValidationError({ message: 'Invalid forecast ID' });

  const { data: forecast } = await db
    .from('forecasts')
    .select('id, rendered_content_json')
    .eq('id', forecastId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!forecast) throw new NotFoundError({ message: 'Forecast not found' });

  const content = forecast.rendered_content_json as Record<string, unknown> | null;
  let status: 'generating' | 'ready' | 'error' = 'generating';
  if (content && typeof content.interpretation === 'string') {
    status = 'ready';
  } else if (content && content.status === 'error') {
    status = 'error';
  }

  return NextResponse.json({ status });
});
