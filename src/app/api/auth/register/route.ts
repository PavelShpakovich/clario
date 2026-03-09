import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { FLAGS } from '@/lib/feature-flags';

export async function POST(request: NextRequest) {
  if (!FLAGS.WEB_AUTH_ENABLED) {
    return NextResponse.json(
      { message: 'Web registration is currently disabled.' },
      { status: 410 },
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Sign up user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      logger.error({ email, error }, 'Auth user creation failed');
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      display_name: deriveDisplayNameFromEmail(data.user.email),
    });

    if (profileError) {
      logger.error({ userId: data.user.id, profileError }, 'Profile creation failed');
      return NextResponse.json({ message: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Registration route failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
