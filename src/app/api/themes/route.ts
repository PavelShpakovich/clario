import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';

const createThemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  language: z.enum(['en', 'ru']).optional().default('en'),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();

  // Fetch user's own themes (private & public) + all public themes from other users
  const { data: themes, error } = await supabase
    .from('themes')
    .select('*')
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const response = NextResponse.json({ themes });

  // Add cache headers - themes are fetched frequently but change on user action
  Object.entries(getCacheHeaders(CACHE_PRESETS.userThemes)).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  return response;
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = createThemeSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { data: theme, error } = await supabase
    .from('themes')
    .insert({ user_id: user.id, ...body.data })
    .select()
    .single();

  if (error ?? !theme) throw error ?? new Error('Failed to create theme');

  return NextResponse.json({ theme }, { status: 201 });
});
