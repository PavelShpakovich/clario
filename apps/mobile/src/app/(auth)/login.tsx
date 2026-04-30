import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { profileApi } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { colors, cardShadow } from '@/lib/colors';
import { AuthBackground } from '@/components/AuthBackground';

export default function LoginScreen() {
  const { verified } = useLocalSearchParams<{ verified?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('validation');

  async function handleLogin() {
    if (!email.trim()) {
      setError(tValidation('emailRequired'));
      return;
    }
    if (!password) {
      setError(tValidation('passwordRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      if (signInError.status === 400) {
        setError(tAuth('invalidCredentials'));
      } else {
        setError(tAuth('error'));
      }
      return;
    }

    const profile = await profileApi.getProfile(true);
    if (!profile.onboarding_completed_at) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackground />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            {/* Eyebrow */}
            <Text style={styles.eyebrow}>{tCommon('appName')}</Text>

            {/* Card header */}
            <Text style={styles.title}>{tAuth('loginTitle')}</Text>
            <Text style={styles.subtitle}>{tAuth('loginDescription')}</Text>

            {/* Form fields */}
            <View style={styles.fieldsContainer}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tAuth('email')}</Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={tAuth('emailPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{tAuth('password')}</Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={tAuth('passwordPlaceholder')}
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            </View>

            {/* Verified banner */}
            {verified === 'true' ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{tAuth('emailVerified')}</Text>
              </View>
            ) : verified === 'error' ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{tAuth('emailVerificationError')}</Text>
              </View>
            ) : null}

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.buttonText}>{tAuth('signingIn')}</Text>
              ) : (
                <Text style={styles.buttonText}>{tAuth('signIn')}</Text>
              )}
            </TouchableOpacity>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.footerLinkContainer}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.footerLink}>{tAuth('forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Register link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{tAuth('noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerRowLink}>{tAuth('signUpLink')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    marginHorizontal: 20,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    ...cardShadow,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  fieldsContainer: {
    gap: 14,
    marginBottom: 16,
  },
  fieldGroup: {
    gap: 0,
  },
  label: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: colors.destructive,
  },
  successBanner: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successBannerText: {
    fontSize: 13,
    color: colors.success,
  },
  errorBanner: {
    backgroundColor: colors.destructiveSubtle,
    borderColor: colors.destructive,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.destructive,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '600',
  },
  footerLinkContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  footerRowLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
});
