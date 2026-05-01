import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { calendarApi } from '@clario/api-client';
import type { CalendarDay } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { messages } from '@clario/i18n';
import { useColors, cardShadow } from '@/lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const signLabels = messages.chartDetail.signs as Record<string, string>;
const phaseLabels = (messages.calendar as { phases: Record<string, string> }).phases;

const PHASE_EMOJI: Record<string, string> = {
  new: '🌑',
  crescent: '🌒',
  'first-quarter': '🌓',
  gibbous: '🌔',
  full: '🌕',
  'waning-gibbous': '🌖',
  'last-quarter': '🌗',
  'waning-crescent': '🌘',
};

const PHASE_KEY_MAP: Record<string, string> = {
  new: 'new',
  crescent: 'crescent',
  'first-quarter': 'firstQuarter',
  gibbous: 'gibbous',
  full: 'full',
  'waning-gibbous': 'waningGibbous',
  'last-quarter': 'lastQuarter',
  'waning-crescent': 'waningCrescent',
};

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const todayStr = new Date().toISOString().slice(0, 10);

export default function CalendarScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  const tCal = useTranslations('calendar');

  useEffect(() => {
    async function load() {
      try {
        const { days: data } = await calendarApi.getCalendar();
        setDays(data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Group days by month
  const months: { name: string; days: CalendarDay[] }[] = [];
  for (const day of days) {
    const d = new Date(day.date + 'T12:00:00Z');
    const monthKey = MONTH_KEYS[d.getUTCMonth()];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthName = `${tCal(`months.${monthKey}` as any)} ${d.getUTCFullYear()}`;
    const existing = months.find((m) => m.name === monthName);
    if (existing) existing.days.push(day);
    else months.push({ name: monthName, days: [day] });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      {/* Page header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>{tCal('eyebrow')}</Text>
          <Text style={styles.heading}>{tCal('heading')}</Text>
          <Text style={styles.description}>{tCal('description')}</Text>
        </View>
        <TouchableOpacity
          style={styles.horoscopeLink}
          onPress={() => router.push('/(tabs)/horoscope')}
        >
          <Text style={styles.horoscopeLinkText}>{tCal('horoscopeLink')}</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>{tCal('legendSun')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
          <Text style={styles.legendText}>{tCal('legendMoon')}</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>🌑</Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Text style={styles.legendText}>{tCal('phases.new' as any)}</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>🌕</Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Text style={styles.legendText}>{tCal('phases.full' as any)}</Text>
        </View>
      </View>

      {/* Calendar months */}
      {months.map((month) => (
        <View key={month.name} style={styles.monthSection}>
          <Text style={styles.monthHeading}>{month.name}</Text>
          <View style={styles.monthGrid}>
            {month.days.map((day) => {
              const d = new Date(day.date + 'T12:00:00Z');
              const isToday = day.date === todayStr;
              const isSpecialPhase = day.phase === 'new' || day.phase === 'full';
              const phaseEmoji = day.phase ? (PHASE_EMOJI[day.phase] ?? '') : '';
              const phaseKey = day.phase ? PHASE_KEY_MAP[day.phase] : null;
              const phaseLabel = phaseKey ? (phaseLabels[phaseKey] ?? '') : '';

              return (
                <View
                  key={day.date}
                  style={[
                    styles.dayCard,
                    isToday && styles.dayCardToday,
                    isSpecialPhase && !isToday && styles.dayCardSpecial,
                  ]}
                >
                  {/* Day number + phase emoji */}
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                      {d.getUTCDate()}
                    </Text>
                    {phaseEmoji ? <Text style={styles.phaseEmoji}>{phaseEmoji}</Text> : null}
                  </View>

                  {/* Sun sign */}
                  {day.sunSign ? (
                    <View style={styles.signRow}>
                      <View style={[styles.signDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.signText} numberOfLines={1}>
                        {signLabels[day.sunSign] ?? day.sunSign}
                      </Text>
                    </View>
                  ) : null}

                  {/* Moon sign */}
                  {day.moonSign ? (
                    <View style={styles.signRow}>
                      <View style={[styles.signDot, { backgroundColor: '#0EA5E9' }]} />
                      <Text style={styles.signText} numberOfLines={1}>
                        {signLabels[day.moonSign] ?? day.moonSign}
                      </Text>
                    </View>
                  ) : null}

                  {/* Special phase label — new/full only */}
                  {isSpecialPhase && phaseLabel ? (
                    <Text style={styles.specialPhaseLabel}>{phaseLabel}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 48,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    // Header
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
    },
    headerLeft: {
      flex: 1,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    heading: {
      fontSize: 26,
      fontWeight: '600',
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    horoscopeLink: {
      marginTop: 24,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    horoscopeLinkText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.foreground,
    },
    // Legend
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendEmoji: {
      fontSize: 12,
      lineHeight: 14,
    },
    legendText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    // Month sections
    monthSection: {
      marginBottom: 24,
    },
    monthHeading: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 10,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    // Day card
    dayCard: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
      padding: 12,
      gap: 4,
    },
    dayCardToday: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    dayCardSpecial: {
      borderColor: colors.border,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
    },
    dayNumberToday: {
      color: colors.primary,
    },
    phaseEmoji: {
      fontSize: 14,
    },
    signRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    signDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      flexShrink: 0,
    },
    signText: {
      fontSize: 11,
      color: colors.mutedForeground,
      flex: 1,
    },
    specialPhaseLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
      marginTop: 2,
    },
  });
}
