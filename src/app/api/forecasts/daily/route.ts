import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { getOrCreateDailyForecast } from '@/lib/forecasts/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Get the user's most recently created ready chart
  const { data: chart } = await db
    .from('charts')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chart) return NextResponse.json({ forecast: null });

  const forecast = await getOrCreateDailyForecast(user.id, chart.id);
  return NextResponse.json({ forecast });
});
