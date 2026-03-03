import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { auth } from '@/auth';
import { ValidationError } from '@/lib/errors';
import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  uiLanguage: z.enum(['en', 'ru']).optional(),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();
  const session = await auth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, telegram_id, ui_language')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const fallbackDisplayName =
      session?.user?.name || session?.user?.email?.split('@')[0] || user.id.slice(0, 8);

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: fallbackDisplayName,
        ui_language: 'en',
      })
      .select('display_name, telegram_id, ui_language')
      .single();

    if (createError ?? !createdProfile) {
      throw createError ?? new Error('Failed to create profile');
    }

    const response = NextResponse.json({
      ...createdProfile,
      streak_count: 0,
    });

    // Add cache headers
    Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([key, value]) =>
      response.headers.set(key, value),
    );

    return response;
  }

  const response = NextResponse.json({
    ...profile,
    streak_count: 0,
  });

  // Add cache headers
  Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  return response;
});

export const PATCH = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = updateProfileSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { displayName, uiLanguage } = body.data;

  const updateData: {
    id: string;
    display_name?: string;
    ui_language?: string;
  } = {
    id: user.id,
  };
  if (displayName) updateData.display_name = displayName;
  if (uiLanguage) updateData.ui_language = uiLanguage;

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .upsert(updateData, { onConflict: 'id' })
    .select('display_name, telegram_id, ui_language')
    .single();

  if (error ?? !updatedProfile) {
    throw error ?? new Error('Failed to update profile');
  }

  return NextResponse.json({
    ...updatedProfile,
    streak_count: 0,
  });
});
