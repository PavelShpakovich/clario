import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBackTo, withReturnTo } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { creditsApi, forecastsApi, ApiClientError } from '@clario/api-client';
import type { DailyForecastRecord, DailyForecastResponse } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { runToastMutation } from '@/lib/mutation-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { useInsufficientCredits } from '@/lib/insufficient-credits-context';
import { usePullToRefresh } from '@/lib/refresh';

function HoroscopeSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.headerRow, { marginTop: insets.top + 8 }]}>
        <View style={styles.backRow}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width={96} height={14} />
        </View>
        <Skeleton width={92} height={36} borderRadius={8} />
      </View>

      <Skeleton width={88} height={11} style={{ marginBottom: 6 }} />
      <Skeleton width={'62%'} height={28} style={{ marginBottom: 8 }} />
      <View style={styles.dateRow}>
        <Skeleton width={14} height={14} borderRadius={7} />
        <Skeleton width={160} height={13} />
      </View>

      <View style={styles.keyThemeChip}>
        <Skeleton width={14} height={14} borderRadius={7} />
        <Skeleton width={140} height={13} />
      </View>

      <View style={styles.moonPhaseRow}>
        <Skeleton width={'72%'} height={13} />
      </View>

      <View style={styles.interpretationBlock}>
        <Skeleton width={'94%'} height={15} />
        <Skeleton width={'100%'} height={15} style={{ marginTop: 12 }} />
        <Skeleton width={'88%'} height={15} style={{ marginTop: 12 }} />
        <Skeleton width={'96%'} height={15} style={{ marginTop: 24 }} />
        <Skeleton width={'91%'} height={15} style={{ marginTop: 12 }} />
        <Skeleton width={'78%'} height={15} style={{ marginTop: 12 }} />
      </View>

      <View style={styles.adviceBlock}>
        <Skeleton width={72} height={11} style={{ marginBottom: 8 }} />
        <Skeleton width={'92%'} height={14} />
        <Skeleton width={'85%'} height={14} style={{ marginTop: 10 }} />
      </View>

      <Skeleton width={'100%'} height={40} borderRadius={8} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

export default function HoroscopeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [forecast, setForecast] = useState<DailyForecastRecord | null>(null);
  const [preview, setPreview] = useState(false);
  const [fullAccessRequired, setFullAccessRequired] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [forecastCost, setForecastCost] = useState<number | null>(null);
  const [forecastIsFree, setForecastIsFree] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const tHoro = useTranslations('horoscope');
  const tCommon = useTranslations('common');
  const tCredits = useTranslations('credits');
  const tWorkspace = useTranslations('workspace');
  const { showInsufficientCredits } = useInsufficientCredits();

  const loadForecast = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data: DailyForecastResponse = await forecastsApi.getDailyForecast();
      setForecast(data.forecast);
      setPreview(data.preview);
      setFullAccessRequired(data.fullAccessRequired);
      setDisplayName(data.displayName ?? '');
      if (!isRefresh && data.forecast?.status === 'pending') {
        void forecastsApi.startGeneration(data.forecast.id);
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, handleRefresh } = usePullToRefresh(() => loadForecast(true));

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    void creditsApi
      .getPricing(true)
      .then((pricing) => {
        setForecastCost(pricing.costs.forecast_report ?? 0);
        setForecastIsFree(pricing.freeProducts.includes('forecast_report'));
      })
      .catch(() => {
        setForecastCost(null);
        setForecastIsFree(false);
      });
  }, []);

  useEffect(() => {
    if (!forecast) return;
    if (forecast.status !== 'pending' && forecast.status !== 'generating') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const data = await forecastsApi.getDailyForecast();
        setForecast(data.forecast);
        setPreview(data.preview);
        setFullAccessRequired(data.fullAccessRequired);
        setDisplayName(data.displayName ?? '');
        if (data.forecast?.status === 'ready' || data.forecast?.status === 'error') {
          clearInterval(intervalRef.current!);
        }
      } catch {
        clearInterval(intervalRef.current!);
      }
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [forecast?.status]);

  // Advance step indicator while generating
  useEffect(() => {
    if (forecast?.status !== 'pending' && forecast?.status !== 'generating') {
      stepTimers.current.forEach(clearTimeout);
      stepTimers.current = [];
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const delays = [5000, 15000, 28000];
    stepTimers.current = delays.map((delay, i) => setTimeout(() => setStepIndex(i + 1), delay));
    return () => {
      stepTimers.current.forEach(clearTimeout);
    };
  }, [forecast?.status]);

  async function handleUnlock() {
    setUnlocking(true);
    try {
      await runToastMutation({
        action: () => forecastsApi.activateAccess(),
        silentSuccess: true,
        errorMessage: tHoro('unlockForecastFailed'),
        mapErrorMessage: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            return undefined;
          }

          return tHoro('unlockForecastFailed');
        },
        toastKey: 'mobile-forecast-unlock',
        onSuccess: async () => {
          await loadForecast(true);
        },
        onError: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            const data = error.data as { required?: number; balance?: number } | undefined;
            showInsufficientCredits({ required: data?.required, balance: data?.balance });
          }
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setUnlocking(false);
    }
  }

  function confirmForecastSpend(onConfirm: () => void) {
    if (forecastIsFree || !forecastCost || forecastCost <= 0) {
      onConfirm();
      return;
    }

    Alert.alert(
      tCredits('confirmSpendTitle'),
      tCredits('confirmSpendDescription', { cost: forecastCost }),
      [
        { text: tCommon('cancel'), style: 'cancel' },
        { text: tCredits('confirm'), onPress: onConfirm },
      ],
      { cancelable: true },
    );
  }

  async function handleRegenerate() {
    if (!forecast) return;
    setRegenerating(true);
    try {
      await runToastMutation({
        action: () => forecastsApi.regenerateForecast(forecast.id),
        silentSuccess: true,
        errorMessage: tHoro('regenerateFailed'),
        mapErrorMessage: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            return undefined;
          }

          return tHoro('regenerateFailed');
        },
        toastKey: 'mobile-forecast-regenerate',
        onSuccess: async () => {
          await loadForecast(true);
        },
        onError: (error) => {
          if (
            error instanceof ApiClientError &&
            (error.status === 402 || error.code === 'insufficient_credits')
          ) {
            const data = error.data as { required?: number; balance?: number } | undefined;
            showInsufficientCredits({ required: data?.required, balance: data?.balance });
          }
        },
      });
    } catch {
      // Toast is handled by runToastMutation.
    } finally {
      setRegenerating(false);
    }
  }

  function handleUnlockPress() {
    if (unlocking) return;

    confirmForecastSpend(() => {
      void handleUnlock();
    });
  }

  function handleRegeneratePress() {
    if (regenerating) return;

    confirmForecastSpend(() => {
      void handleRegenerate();
    });
  }

  if (loading) {
    return <HoroscopeSkeleton />;
  }

  if (!forecast) {
    return (
      <View style={styles.center}>
        <Ionicons name="planet-outline" size={48} color={colors.border} />
        <Text style={styles.noChartText}>{tHoro('noChartMessage')}</Text>
        <TouchableOpacity
          onPress={() => router.push(withReturnTo('/(tabs)/charts/new', '/horoscope') as never)}
        >
          <Text style={styles.linkText}>{tWorkspace('createChart')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const STEP_LABELS = [
    tHoro('generatingStep1'),
    tHoro('generatingStep2'),
    tHoro('generatingStep3'),
    tHoro('generatingStep4'),
  ];
  const backLabel = tHoro('backToDashboard').replace(/^←\s*/, '');

  // Generating
  if (forecast.status === 'pending' || forecast.status === 'generating') {
    return (
      <View style={[styles.generatingContainer, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => goBackTo(returnTo, '/(tabs)/index')}
          style={[styles.backRow, styles.generatingBack]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>
        <View style={styles.generatingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>{tHoro('generatingTitle')}</Text>
          <Text style={styles.generatingStep}>{STEP_LABELS[stepIndex]}</Text>
          <View style={styles.progressDots}>
            {STEP_LABELS.map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Error
  if (forecast.status === 'error') {
    return (
      <View style={[styles.generatingContainer, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => goBackTo(returnTo, '/(tabs)/index')}
          style={[styles.backRow, styles.generatingBack]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>
        <View style={styles.generatingContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>{tHoro('generatingErrorTitle')}</Text>
          <Text style={styles.errorDesc}>{tHoro('generatingErrorDesc')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRegeneratePress}
            disabled={regenerating}
          >
            {regenerating ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={styles.retryButtonText}>{tHoro('generatingRetry')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Ready
  const content = forecast.rendered_content_json;
  const interpretation = content?.interpretation ?? '';
  const advice = content?.advice ?? '';
  const keyTheme = content?.keyTheme ?? '';
  const moonPhase = content?.moonPhase ?? '';
  const paragraphs = interpretation.split('\n\n').filter(Boolean);

  const forecastDate = forecast.target_start_date
    ? new Date(`${forecast.target_start_date}T12:00:00`)
    : new Date(forecast.created_at);
  const today = forecastDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { marginTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => goBackTo(returnTo, '/(tabs)/index')}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tHoro('backToDashboard').replace(/^←\s*/, '')}</Text>
        </TouchableOpacity>
        {!fullAccessRequired && (
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegeneratePress}
            disabled={regenerating}
          >
            {regenerating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.regenerateText}>{tHoro('regenerate')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.eyebrow}>{tHoro('pageTitle')}</Text>
      <Text style={styles.title}>{displayName || tHoro('pageTitle')}</Text>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
        <Text style={styles.date}>{today}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Key theme chip — shown in both preview and full */}
        {keyTheme ? (
          <View style={styles.keyThemeChip}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.keyThemeText}>{keyTheme}</Text>
          </View>
        ) : null}

        {/* Moon phase — full access only */}
        {!preview && moonPhase ? (
          <View style={styles.moonPhaseRow}>
            <Text style={styles.moonPhaseText}>{moonPhase}</Text>
          </View>
        ) : null}

        {/* Interpretation card */}
        {paragraphs.length > 0 ? (
          <View style={styles.interpretationBlock}>
            {paragraphs.map((para, i) => (
              <Text key={i} style={[styles.interpretationText, i > 0 && { marginTop: 12 }]}>
                {para}
              </Text>
            ))}
            {/* Fade overlay for preview */}
            {preview && <View style={styles.previewFade} pointerEvents="none" />}
          </View>
        ) : null}

        {/* Preview unlock CTA */}
        {fullAccessRequired && (
          <View style={styles.unlockCta}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <Text style={styles.unlockCtaNote}>{tHoro('previewNote')}</Text>
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={handleUnlockPress}
              disabled={unlocking}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={styles.unlockButtonText}>
                  {forecastIsFree ? tHoro('unlockForecastFree') : tHoro('unlockForecast')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Advice block — full access only */}
        {!preview && advice ? (
          <View style={styles.adviceBlock}>
            <Text style={styles.adviceLabel}>{tHoro('adviceLabel')}</Text>
            <Text style={styles.adviceText}>{advice}</Text>
          </View>
        ) : null}

        {/* Calendar link — outline button */}
        <TouchableOpacity
          style={styles.calendarLink}
          onPress={() => router.push(withReturnTo('/calendar', '/horoscope') as never)}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.foreground} />
          <Text style={styles.calendarLinkText}>{tHoro('calendarLink')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 48,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 12,
      padding: 24,
    },
    generatingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    generatingBack: {
      alignSelf: 'flex-start',
      marginBottom: 0,
    },
    generatingContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 20,
      paddingBottom: 60,
    },
    progressDots: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    progressDot: {
      width: 24,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primaryTint,
    },
    progressDotActive: {
      backgroundColor: colors.primary,
    },
    // Header row: back link on left, regenerate on right
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 40,
      marginBottom: 20,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backText: {
      color: colors.mutedForeground,
      fontSize: 14,
    },
    // Regenerate — small outline button (height:36)
    regenerateButton: {
      height: 36,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    regenerateText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    // Page heading
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
    },
    date: {
      fontSize: 13,
      color: colors.mutedForeground,
      textTransform: 'capitalize',
    },
    // Key theme chip
    keyThemeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.primaryTint,
      backgroundColor: colors.primarySubtle,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    keyThemeText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    // Moon phase — left border italic
    moonPhaseRow: {
      borderLeftWidth: 2,
      borderLeftColor: colors.primaryTint,
      paddingLeft: 12,
      marginBottom: 12,
    },
    moonPhaseText: {
      fontSize: 13,
      fontStyle: 'italic',
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    // Interpretation — card style
    interpretationBlock: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
      padding: 16,
      marginBottom: 16,
      overflow: 'hidden',
    },
    interpretationText: {
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 26,
    },
    // Preview fade overlay
    previewFade: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: colors.card,
      opacity: 0.9,
    },
    // Unlock CTA card
    unlockCta: {
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.primaryTint,
      backgroundColor: colors.primarySubtle,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    unlockCtaNote: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
    },
    // Unlock — primary full-width button
    unlockButton: {
      backgroundColor: colors.primary,
      height: 40,
      borderRadius: 8,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unlockButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    // Advice — left border accent
    adviceBlock: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 14,
      marginBottom: 20,
    },
    adviceLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 6,
    },
    adviceText: {
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 22,
    },
    // Calendar link — outline button full-width
    calendarLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    calendarLinkText: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    // Empty / error states
    noChartText: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    linkText: {
      color: colors.primary,
      fontSize: 15,
    },
    generatingTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    generatingStep: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      minHeight: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.error,
      textAlign: 'center',
    },
    errorDesc: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      height: 40,
      borderRadius: 8,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    retryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
