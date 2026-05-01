import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { profileApi } from '@clario/api-client';
import { useColors } from '@/lib/colors';

export default function Index() {
  const colors = useColors();

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        const profile = await profileApi.getProfile(true);
        if (!profile.onboarding_completed_at) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } catch {
        // If profile fetch fails, go to tabs anyway
        router.replace('/(tabs)');
      }
    }

    void check();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
