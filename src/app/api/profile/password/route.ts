import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const PATCH = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const body = updatePasswordSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { password } = body.data;

  // Use supabaseAdmin to update the user's password directly
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return NextResponse.json({ success: true });
});
