import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateResetToken } from '@/lib/auth/password-reset';

const bodySchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/auth/password/update
 *
 * Updates the user's password using a valid reset token from OTP verification.
 */
export const POST = withApiHandler(async (req) => {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { resetToken, newPassword } = body.data;

  try {
    // Validate the reset token and get the email
    const email = await validateResetToken(resetToken);

    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Get the user by email to find their ID
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError || !userData) {
      throw userError || new Error('Failed to list users');
    }

    const user = userData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    // Mark email as confirmed since they proved inbox access by verifying OTP
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (confirmError) {
      logger.warn(
        { error: confirmError, userId: user.id },
        'Failed to confirm email after password reset',
      );
    }

    // Invalidate all sessions for this user (force re-login)
    // This is handled by Supabase automatically on password change

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to update password');
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
});
