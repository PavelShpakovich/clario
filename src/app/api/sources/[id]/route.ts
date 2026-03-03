import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const DELETE = withApiHandler(async (_req, ctx) => {
  const { user, supabase } = await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const { data: source } = await supabase
    .from('data_sources')
    .select('id, storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!source) {
    throw new NotFoundError({ message: 'Source not found' });
  }

  if (source.storage_path) {
    await supabaseAdmin.storage.from('sources').remove([source.storage_path]);
  }

  const { error } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to delete source');
  }

  return NextResponse.json({ ok: true });
});
