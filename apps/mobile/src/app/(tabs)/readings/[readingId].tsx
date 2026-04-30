import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { readingsApi, getAuthHeaders, resolveUrl } from '@clario/api-client';
import type { ReadingDetail } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { messages } from '@clario/i18n';
const notifMessages = messages.notifications;
import { colors, cardShadow } from '@/lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleReadyNotification } from '@/lib/notifications';

const readingTypeLabelsMap = messages.readingDetail.readingTypes as Record<string, string>;

const POLL_INTERVAL_MS = 3000;

export default function ReadingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { readingId } = useLocalSearchParams<{ readingId: string }>();
  const [reading, setReading] = useState<ReadingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tDetail = useTranslations('readingDetail');
  const tGenerating = useTranslations('readingGenerating');
  const tNav = useTranslations('navigation');

  useEffect(() => {
    if (!readingId) return;
    void loadReading();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [readingId]);

  useEffect(() => {
    if (!readingId || !reading) return;
    const { status } = reading;

    if (status !== 'pending' && status !== 'generating') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (status === 'pending') {
      void readingsApi.startGeneration(readingId).catch(() => {});
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const { reading: updated } = await readingsApi.getReading(readingId);
        const wasGenerating =
          prevStatusRef.current === 'generating' || prevStatusRef.current === 'pending';
        prevStatusRef.current = updated.status;
        setReading(updated);
        if (updated.status === 'ready') {
          if (wasGenerating) {
            void scheduleReadyNotification(updated.title ?? notifMessages.readingReady);
          }
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
        } else if (updated.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        // network hiccup — retry next tick
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [reading?.status, readingId]);

  async function loadReading() {
    if (!readingId) return;
    try {
      const { reading: data } = await readingsApi.getReading(readingId);
      setReading(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!readingId) return;
    setDownloadingPdf(true);
    try {
      const authHeaders = await getAuthHeaders();
      const url = resolveUrl(`/api/readings/${readingId}/pdf`);
      const localUri = `${FileSystem.cacheDirectory}reading-${readingId}.pdf`;
      const result = await FileSystem.downloadAsync(url, localUri, {
        headers: authHeaders,
      });
      if (result.status !== 200) {
        toast.error(tDetail('downloadPdfError'));
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: reading?.title ?? tDetail('downloadPdf'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        toast.success(tDetail('downloadPdfSaved'));
      }
    } catch {
      toast.error(tDetail('downloadPdfError'));
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleRetry() {
    if (!readingId) return;
    setRetrying(true);
    try {
      await readingsApi.resetForRetry(readingId);
      const { reading: refreshed } = await readingsApi.getReading(readingId);
      setReading(refreshed);
    } finally {
      setRetrying(false);
    }
  }

  const readingTypeLabels: Record<string, string> = readingTypeLabelsMap;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reading) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{tDetail('notFoundTitle')}</Text>
        <TouchableOpacity onPress={() => goBack('/(tabs)/readings')}>
          <Text style={styles.linkText}>{tNav('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { status } = reading;
  const content = reading.rendered_content_json;
  const placementHighlights = content?.placementHighlights ?? [];
  const advice = content?.advice ?? [];
  const disclaimers = content?.disclaimers ?? [];
  const isReady = status === 'ready';
  const isError = status === 'error';
  const isGenerating = status === 'pending' || status === 'generating';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Back */}
      <TouchableOpacity
        style={[styles.backButton, { marginTop: insets.top + 8 }]}
        onPress={() => goBack('/(tabs)/readings')}
      >
        <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
        <Text style={styles.backText}>{tDetail('backToReadings')}</Text>
      </TouchableOpacity>

      {/* Title block: type + title + date + status badge */}
      <View style={styles.titleBlock}>
        <Text style={styles.typeLabel}>
          {readingTypeLabels[reading.reading_type] ?? reading.reading_type}
        </Text>
        <Text style={styles.title}>{reading.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>
            {reading.created_at
              ? new Date(reading.created_at).toLocaleDateString('ru', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : ''}
          </Text>
          {!isReady ? (
            <View
              style={[
                styles.statusBadge,
                isError ? styles.statusBadgeError : styles.statusBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isError ? styles.statusBadgeTextError : styles.statusBadgeTextPending,
                ]}
              >
                {isError
                  ? tDetail('statusError')
                  : status === 'generating'
                    ? tDetail('statusGenerating')
                    : tDetail('statusPending')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        {/* View Chart — always shown */}
        {reading.chart_id ? (
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => router.push(`/(tabs)/charts/${reading.chart_id}`)}
          >
            <Ionicons name="planet-outline" size={15} color={colors.primary} />
            <Text style={styles.outlineButtonText}>{tDetail('viewChart')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Ask follow-up — only if ready */}
        {isReady ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/(tabs)/readings/chat/${readingId}`)}
          >
            <Ionicons name="chatbubble-outline" size={15} color={colors.primaryForeground} />
            <Text style={styles.primaryButtonText}>{tDetail('askFollowUp')}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Download PDF — only if ready */}
        {isReady ? (
          <TouchableOpacity
            style={[styles.outlineButton, downloadingPdf && styles.buttonDisabled]}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={15} color={colors.primary} />
                <Text style={styles.outlineButtonText}>{tDetail('downloadPdf')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Retry — only if error */}
        {isError ? (
          <TouchableOpacity
            style={[styles.primaryButton, retrying && styles.buttonDisabled]}
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryButtonText}>{tGenerating('retryButton')}</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Generating / pending spinner */}
      {isGenerating ? (
        <View style={styles.generatingBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>{tGenerating('title')}</Text>
          <Text style={styles.generatingDesc}>{tGenerating('analyzing')}</Text>
        </View>
      ) : null}

      {/* Error banner */}
      {isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerTitle}>{tDetail('errorBannerTitle')}</Text>
          <Text style={styles.errorBannerDesc}>{tDetail('errorBannerDesc')}</Text>
        </View>
      ) : null}

      {/* Content — only when not error */}
      {!isError ? (
        <>
          {/* Summary */}
          {reading.summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{reading.summary}</Text>
            </View>
          ) : null}

          {/* Key Takeaways (advice) */}
          {advice.length > 0 ? (
            <View style={styles.takeawaysCard}>
              <Text style={styles.takeawaysHeading}>{tDetail('keyTakeaways')}</Text>
              {advice.map((item, idx) => (
                <View key={idx} style={styles.numberedRow}>
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberCircleText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.numberedRowText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Sections */}
          {reading.reading_sections.length > 0 ? (
            <View style={styles.sectionsBlock}>
              {reading.reading_sections.map((section, idx) => (
                <View key={section.id} style={styles.sectionItem}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionNumberCircle}>
                      <Text style={styles.sectionNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <View style={styles.sectionBody}>
                    {section.content
                      .split('\n\n')
                      .filter(Boolean)
                      .map((para, pIdx) => (
                        <Text key={pIdx} style={styles.sectionParagraph}>
                          {para}
                        </Text>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Placement Highlights — 2-column grid */}
          {placementHighlights.length > 0 ? (
            <View style={styles.highlightsBlock}>
              <Text style={styles.highlightsTitle}>{tDetail('placementHighlights')}</Text>
              <View style={styles.highlightsGrid}>
                {placementHighlights.map((item, idx) => (
                  <View key={idx} style={styles.highlightCell}>
                    <Text style={styles.highlightText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Disclaimers */}
          {disclaimers.length > 0 ? (
            <View style={styles.disclaimersCard}>
              <Text style={styles.disclaimersText}>{disclaimers.join(' ')}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },

  // ── Back ─────────────────────────────────────────────────────────────────────
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },

  // ── Title block ───────────────────────────────────────────────────────────────
  titleBlock: {
    gap: 6,
    marginBottom: 20,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.foreground,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  statusBadge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeError: {
    backgroundColor: colors.destructiveSubtle,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeTextError: {
    color: colors.destructive,
  },
  statusBadgeTextPending: {
    color: '#92400E',
  },

  // ── Action buttons ────────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ── Generating ────────────────────────────────────────────────────────────────
  generatingBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  generatingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
  },
  generatingDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 21,
    textAlign: 'center',
  },

  // ── Error banner ──────────────────────────────────────────────────────────────
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: colors.destructiveSubtle,
    padding: 16,
    gap: 4,
    marginBottom: 20,
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.destructive,
  },
  errorBannerDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 19,
  },

  // ── Summary ───────────────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: colors.primarySubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    padding: 20,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 26,
    fontStyle: 'italic',
  },

  // ── Key Takeaways ─────────────────────────────────────────────────────────────
  takeawaysCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  takeawaysHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  numberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  numberCircleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  numberedRowText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 21,
  },

  // ── Sections ──────────────────────────────────────────────────────────────────
  sectionsBlock: {
    gap: 28,
    marginBottom: 20,
  },
  sectionItem: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
    letterSpacing: -0.3,
  },
  sectionBody: {
    paddingLeft: 38,
    gap: 10,
  },
  sectionParagraph: {
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 26,
  },

  // ── Placement Highlights ──────────────────────────────────────────────────────
  highlightsBlock: {
    gap: 10,
    marginBottom: 20,
  },
  highlightsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightCell: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...cardShadow,
  },
  highlightText: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },

  // ── Disclaimers ───────────────────────────────────────────────────────────────
  disclaimersCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  disclaimersText: {
    fontSize: 11,
    color: colors.mutedForeground,
    lineHeight: 17,
  },

  // ── Misc ──────────────────────────────────────────────────────────────────────
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.destructive,
    textAlign: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
});
