import { useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AuthBackground } from '@/components/AuthBackground';
import { useColors } from '@/lib/colors';

/**
 * Handles clario://auth/callback?access_token=...&refresh_token=...&type=recovery
 *
 * The web /auth/callback page converts the Supabase hash fragment into query
 * params before opening this deep link (iOS strips URL fragments from deep links).
 *
 * Expo Router parses the URL and passes params here via useLocalSearchParams —
 * no Linking.getInitialURL() race condition, works for both cold and warm start.
 */
export default function AuthCallbackScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
    code?: string;
    error?: string;
  }>();

  useEffect(() => {
    const { access_token, refresh_token, type, code, error } = params;

    async function process() {
      // Supabase returned an error (e.g. otp_expired) — send the user to
      // forgot-password so they can request a fresh reset link.
      if (error) {
        router.replace('/(auth)/forgot-password');
        return;
      }

      if (access_token && refresh_token) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!error && type === 'recovery') {
            router.replace('/(auth)/set-password');
          } else {
            router.replace('/(auth)/login');
          }
        } catch {
          router.replace('/(auth)/login');
        }
        return;
      }

      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
          router.replace('/(tabs)');
        } catch {
          router.replace('/(auth)/login');
        }
        return;
      }

      // No recognisable tokens — fall back to login
      router.replace('/(auth)/login');
    }

    // Defer navigation by one tick so the Root Layout navigation container
    // is fully mounted before we attempt to navigate (cold-start via deep link).
    const t = setTimeout(() => void process(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <AuthBackground />
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
