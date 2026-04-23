import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { getOrCreateDailyForecast } from '@/lib/forecasts/service';
import { hasForecastAccess } from '@/lib/credits/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Get the user's most recently created ready chart + timezone
  const [{ data: chart }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('profiles').select('timezone').eq('id', user.id).maybeSingle(),
  ]);

  if (!chart) return NextResponse.json({ forecast: null });

  const forecast = await getOrCreateDailyForecast(user.id, chart.id, profile?.timezone);

  // Check if user has paid forecast access
  const hasAccess = await hasForecastAccess(user.id);

  if (!hasAccess && forecast) {
    // Return preview only: first paragraph of interpretation
    const contentJson = forecast.rendered_content_json as Record<string, unknown> | null;
    const fullContent =
      typeof contentJson?.interpretation === 'string' ? contentJson.interpretation : '';
    const firstParagraph = fullContent.split('\n\n')[0] ?? fullContent.slice(0, 300);
    return NextResponse.json({
      forecast: {
        ...forecast,
        rendered_content_json: { ...contentJson, interpretation: firstParagraph },
      },
      preview: true,
      fullAccessRequired: true,
    });
  }

  return NextResponse.json({ forecast, preview: false, fullAccessRequired: false });
});
