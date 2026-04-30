import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { decode as nextAuthJwtDecode, encode as nextAuthJwtEncode } from 'next-auth/jwt';
import { isAuthApiError } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';
import { env } from '@/lib/env';
import { createSupabaseAuthClient } from '@/lib/supabase/auth-client';
import { findAuthUserByEmail } from '@/lib/auth/user-accounts';

declare module 'next-auth' {
  interface User {
    id: string;
    isAdmin?: boolean;
    isStub?: boolean;
    isEmailVerified?: boolean;
  }
  interface Session {
    user: User & {
      id: string;
      isAdmin?: boolean;
      isStub?: boolean;
      isEmailVerified?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    displayName?: string;
    email?: string;
    isAdmin?: boolean;
    isStub?: boolean;
    isEmailVerified?: boolean;
  }
}

// Standard cookie settings
const isProduction = process.env.NODE_ENV === 'production';

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: isProduction ? ('none' as const) : ('lax' as const),
        path: '/',
        secure: isProduction,
      },
    },
  },
  jwt: {
    async encode(params) {
      return nextAuthJwtEncode(params);
    },
    async decode(params) {
      try {
        return await nextAuthJwtDecode(params);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isJwtDecryptError =
          message.includes('decryption operation failed') ||
          message.includes('JWEDecryptionFailed');

        if (isJwtDecryptError) {
          return null;
        }

        throw error;
      }
    },
  },
  providers: [
    Credentials({
      id: 'password',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        const existingUser = await findAuthUserByEmail(email);
        if (existingUser && !existingUser.emailConfirmedAt) {
          throw new Error('email_not_verified');
        }

        const authClient = createSupabaseAuthClient();
        const { data, error } = await authClient.auth.signInWithPassword({ email, password });

        if (error) {
          // Surface email-not-confirmed as a distinct error so the login form
          // can prompt the user to verify their inbox instead of showing a
          // generic "invalid credentials" message.
          if (
            error.message.toLowerCase().includes('email not confirmed') ||
            (isAuthApiError(error) && error.code === 'email_not_confirmed')
          ) {
            throw new Error('email_not_verified');
          }
          return null;
        }

        if (!data.user) {
          return null;
        }

        if (data.user.email && !data.user.email_confirmed_at) {
          throw new Error('email_not_verified');
        }

        await ensureSupabaseIdentityLink(data.user.id, data.user.email ?? email);

        const fallbackDisplayName = deriveDisplayNameFromEmail(data.user.email ?? email);
        let { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('display_name, is_admin')
          .eq('id', data.user.id)
          .maybeSingle<{ display_name: string | null; is_admin: boolean | null }>();

        if (!profile) {
          const { data: createdProfile } = await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                display_name: fallbackDisplayName,
              },
              { onConflict: 'id' },
            )
            .select('display_name, is_admin')
            .single();

          profile = createdProfile;
        }

        const authEmail = data.user.email ?? email;

        return {
          id: data.user.id,
          name: profile?.display_name || fallbackDisplayName,
          email: authEmail,
          isAdmin: profile?.is_admin || false,
          isStub: false,
          isEmailVerified: Boolean(existingUser?.emailConfirmedAt ?? data.user.email_confirmed_at),
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.displayName = user.name || undefined;
        token.email = user.email || undefined;
        token.isAdmin = user.isAdmin || false;
        token.isStub = user.isStub ?? false;
        token.isEmailVerified = user.isEmailVerified ?? true;
      } else if (token.userId) {
        // On refresh, fetch the latest auth and profile state so middleware
        // does not keep trusting a stale verification flag from an old JWT.
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(
            token.userId,
          );

          if (authError || !authData.user) {
            token.isEmailVerified = false;
            token.isAdmin = false;
            return token;
          }

          const authEmail = authData.user.email;

          token.email = authEmail || undefined;
          token.isStub = false;
          token.isEmailVerified = !authEmail ? true : Boolean(authData.user.email_confirmed_at);

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('display_name, is_admin')
            .eq('id', token.userId)
            .single();

          if (profile?.display_name) {
            token.displayName = profile.display_name;
          }

          // Check if admin via is_admin column or ADMIN_EMAILS env
          let isAdmin = profile?.is_admin || false;
          if (!isAdmin && env.ADMIN_EMAILS && authEmail) {
            const adminEmails = env.ADMIN_EMAILS.split(',').map((entry) =>
              entry.trim().toLowerCase(),
            );
            isAdmin = adminEmails.includes(authEmail.toLowerCase());
          }
          token.isAdmin = isAdmin;
        } catch {
          token.isEmailVerified = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        if (token.displayName) {
          session.user.name = token.displayName;
        }
        if (token.email) {
          session.user.email = token.email;
        }
        session.user.isAdmin = token.isAdmin || false;
        session.user.isStub = token.isStub || false;
        session.user.isEmailVerified = token.isEmailVerified ?? true;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
