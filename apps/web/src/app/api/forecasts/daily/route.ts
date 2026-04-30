import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { getOrCreateDailyForecast } from '@/lib/forecasts/service';
import { hasForecastAccess } from '@/lib/credits/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Get the user's most recently created ready chart + timezone + display name
  const [{ data: chart }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('id, person_name')
      .eq('user_id', user.id)
      .eq('status', 'ready')
      .eq('subject_type', 'self')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from('profiles').select('display_name, timezone').eq('id', user.id).maybeSingle(),
  ]);

  if (!chart) return NextResponse.json({ forecast: null, displayName: '' });

  const displayName = (profile as { display_name?: string | null } | null)?.display_name
    ?? (chart as { person_name?: string | null } | null)?.person_name
    ?? '';

  const forecast = await getOrCreateDailyForecast(user.id, chart.id, profile?.timezone);

  // Derive status from rendered_content_json (forecasts table has no status column)
  const contentJson = forecast.rendered_content_json as Record<string, unknown> | null;
  const derivedStatus: string =
    contentJson && typeof contentJson.interpretation === 'string'
      ? 'ready'
      : contentJson && contentJson.status === 'error'
        ? 'error'
        : 'pending';

  // Check if user has paid forecast access
  const hasAccess = await hasForecastAccess(user.id);

  if (!hasAccess && forecast && derivedStatus === 'ready') {
    // Return preview only: first paragraph of interpretation
    const fullContent =
      typeof contentJson?.interpretation === 'string' ? contentJson.interpretation : '';
    const firstParagraph = fullContent.split('\n\n')[0] ?? fullContent.slice(0, 300);
    return NextResponse.json({
      forecast: {
        ...forecast,
        status: derivedStatus,
        rendered_content_json: { ...contentJson, interpretation: firstParagraph },
      },
      preview: true,
      fullAccessRequired: true,
      displayName,
    });
  }

  return NextResponse.json({
    forecast: { ...forecast, status: derivedStatus },
    preview: false,
    fullAccessRequired: !hasAccess,
    displayName,
  });
});
