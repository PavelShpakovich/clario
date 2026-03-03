import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { decode as nextAuthJwtDecode, encode as nextAuthJwtEncode } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

declare module 'next-auth' {
  interface User {
    id: string;
  }
  interface Session {
    user: User & {
      id: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    displayName?: string;
  }
}

const nextAuthSecret = env.NEXTAUTH_SECRET ?? env.SUPABASE_SERVICE_KEY;

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
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
      id: 'credentials',
      name: 'Email/Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          throw new Error('Invalid email or password');
        }

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          await supabaseAdmin.from('profiles').insert({
            id: data.user.id,
            telegram_id: null,
            display_name: data.user.email?.split('@')[0] || 'User',
          });
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: profile?.display_name || data.user.email?.split('@')[0] || 'User',
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
      } else if (token.userId) {
        // On refresh, fetch the latest display_name from database
        try {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('display_name')
            .eq('id', token.userId)
            .single();

          if (profile?.display_name) {
            token.displayName = profile.display_name;
          }
        } catch {
          // If error, keep existing displayName
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
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
};
