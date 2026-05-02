import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chartsApi } from '@clario/api-client';
import type { ChartRecord } from '@clario/api-client';
import { withReturnTo } from '@/lib/navigation';
import { useTranslations } from '@/lib/i18n';
import { useConfirm } from '@/components/ConfirmDialog';
import { messages } from '@clario/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';

const subjectTypeLabelsMap = messages.workspace.subjectTypes as Record<string, string>;
const signsMap = messages.chartDetail.signs as Record<string, string>;

// Map zodiac sign keys to their classical element
const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

type Element = 'fire' | 'earth' | 'air' | 'water';

function getElementColors(
  element: Element | null,
  colors: ReturnType<typeof useColors>,
): { bg: string; text: string } {
  switch (element) {
    case 'fire':
      return { bg: colors.fireSubtle, text: colors.fire };
    case 'earth':
      return { bg: colors.earthSubtle, text: colors.earth };
    case 'air':
      return { bg: colors.airSubtle, text: colors.air };
    case 'water':
      return { bg: colors.waterSubtle, text: colors.water };
    default:
      return { bg: colors.primaryTint, text: colors.primary };
  }
}

function getChartElement(chart: ChartRecord): Element | null {
  const sunSign = chart.big_three?.sun;
  if (!sunSign) return null;
  return SIGN_ELEMENT[sunSign.toLowerCase()] ?? null;
}

function ChartsListSkeleton() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Skeleton width={70} height={10} />
            <Skeleton width={130} height={20} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={36} height={36} borderRadius={8} />
        </View>
        <Skeleton width={'80%'} height={12} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.listContent}>
        <View style={styles.listSectionHeader}>
          <Skeleton width={90} height={14} />
          <Skeleton width={28} height={20} borderRadius={10} />
        </View>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: 'transparent' }]} />
            <View style={styles.cardBody}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.cardInfo}>
                <View style={styles.cardHeaderRow}>
                  <Skeleton width={'55%'} height={14} />
                  <Skeleton width={50} height={18} borderRadius={9} />
                </View>
                <Skeleton width={'40%'} height={11} style={{ marginTop: 4 }} />
                <Skeleton width={'70%'} height={11} style={{ marginTop: 3 }} />
                <View style={styles.bigThreeRow}>
                  <Skeleton width={64} height={18} borderRadius={9} />
                  <Skeleton width={64} height={18} borderRadius={9} />
                  <Skeleton width={64} height={18} borderRadius={9} />
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ChartsListScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [charts, setCharts] = useState<ChartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tWorkspace = useTranslations('workspace');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();

  const loadCharts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { charts: data } = await chartsApi.listCharts();
      setCharts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  function handleRefresh() {
    setRefreshing(true);
    void loadCharts(true);
  }

  async function confirmDelete(chart: ChartRecord) {
    const ok = await confirm({
      title: tWorkspace('deleteChart'),
      description: tWorkspace('confirmDeleteChart', { label: chart.label }),
      confirmText: tWorkspace('deleteChart'),
      cancelText: tCommon('cancel'),
      destructive: true,
    });
    if (!ok) return;
    await chartsApi.deleteChart(chart.id);
    setCharts((prev) => prev.filter((c) => c.id !== chart.id));
  }

  const subjectTypeLabels: Record<string, string> = subjectTypeLabelsMap;

  if (loading) {
    return <ChartsListSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{tWorkspace('sectionLabel')}</Text>
            <Text style={styles.pageTitle}>{tWorkspace('heading')}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              router.push(withReturnTo('/(tabs)/charts/new', '/(tabs)/charts') as never)
            }
          >
            <Ionicons name="add" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
        <Text style={styles.pageDesc}>{tWorkspace('description')}</Text>
      </View>

      {charts.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{tWorkspace('noChartsTitle')}</Text>
            <Text style={styles.emptyDesc}>{tWorkspace('noChartsDescription')}</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                router.push(withReturnTo('/(tabs)/charts/new', '/(tabs)/charts') as never)
              }
            >
              <Text style={styles.primaryButtonText}>{tWorkspace('createChart')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={charts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <View style={styles.listSectionHeader}>
              <Text style={styles.listSectionTitle}>{tWorkspace('savedCharts')}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{charts.length}</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const element = getChartElement(item);
            const elementColors = getElementColors(element, colors);
            const initial = (item.label ?? item.person_name ?? '?')[0]?.toUpperCase() ?? '?';
            const bigThree = item.big_three;
            const birthTimeLine =
              item.birth_time_known && item.birth_time
                ? `${item.birth_date} · ${item.birth_time}`
                : item.birth_date;

            return (
              <SwipeToDeleteRow onDeletePress={() => confirmDelete(item)}>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() =>
                    router.push(
                      withReturnTo(`/(tabs)/charts/${item.id}`, '/(tabs)/charts') as never,
                    )
                  }
                >
                  {/* Element accent bar */}
                  <View style={[styles.cardAccent, { backgroundColor: elementColors.text }]} />

                  <View style={styles.cardBody}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: elementColors.bg }]}>
                      <Text style={[styles.avatarText, { color: elementColors.text }]}>
                        {initial}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={styles.cardInfo}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardLabel} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <View style={[styles.typeBadge, { backgroundColor: elementColors.bg }]}>
                          <Text style={[styles.typeBadgeText, { color: elementColors.text }]}>
                            {subjectTypeLabels[item.subject_type] ?? item.subject_type}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.cardSub}>{item.person_name}</Text>
                      <Text style={styles.cardSub}>
                        {birthTimeLine}
                        {item.city ? ` · ${item.city}` : ''}
                      </Text>

                      {/* Big Three badges */}
                      {bigThree && (bigThree.sun || bigThree.moon || bigThree.asc) && (
                        <View style={styles.bigThreeRow}>
                          {bigThree.sun && (
                            <View style={[styles.bigThreeBadge, styles.sunBadge]}>
                              <Text style={[styles.bigThreeText, styles.sunText]}>
                                {'☉ ' + (signsMap[bigThree.sun] ?? bigThree.sun)}
                              </Text>
                            </View>
                          )}
                          {bigThree.moon && (
                            <View style={[styles.bigThreeBadge, styles.moonBadge]}>
                              <Text style={[styles.bigThreeText, styles.moonText]}>
                                {'☽ ' + (signsMap[bigThree.moon] ?? bigThree.moon)}
                              </Text>
                            </View>
                          )}
                          {bigThree.asc && (
                            <View style={[styles.bigThreeBadge, styles.ascBadge]}>
                              <Text style={[styles.bigThreeText, styles.ascText]}>
                                {'↑ ' + (signsMap[bigThree.asc] ?? bigThree.asc)}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </SwipeToDeleteRow>
            );
          }}
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    // ── Header ──────────────────────────────────────────────────────────────────
    headerBar: {
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 6,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    pageDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
      paddingBottom: 8,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 2,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── List ─────────────────────────────────────────────────────────────────────
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 32,
      gap: 10,
    },

    // ── Chart card ───────────────────────────────────────────────────────────────
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      flexDirection: 'row',
      overflow: 'hidden',
      ...cardShadow,
    },
    cardAccent: {
      width: 4,
      alignSelf: 'stretch',
    },
    cardBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      paddingHorizontal: 12,
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
    },
    cardInfo: {
      flex: 1,
      gap: 2,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      flex: 1,
    },
    cardSub: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    typeBadge: {
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 2,
      flexShrink: 0,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },

    // ── Big Three badges ─────────────────────────────────────────────────────────
    bigThreeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 5,
    },
    bigThreeBadge: {
      borderRadius: 99,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    bigThreeText: {
      fontSize: 11,
      fontWeight: '500',
    },
    sunBadge: {
      backgroundColor: '#fef3c7',
    },
    sunText: {
      color: '#b45309',
    },
    moonBadge: {
      backgroundColor: '#e0f2fe',
    },
    moonText: {
      color: '#0369a1',
    },
    ascBadge: {
      backgroundColor: '#ede9fe',
    },
    ascText: {
      color: '#6d28d9',
    },

    // ── List section header ───────────────────────────────────────────────────────
    listSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    listSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    countBadge: {
      backgroundColor: colors.muted,
      borderRadius: 99,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
    },

    // ── Empty state ───────────────────────────────────────────────────────────────
    emptyWrapper: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    emptyState: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      textAlign: 'center',
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
