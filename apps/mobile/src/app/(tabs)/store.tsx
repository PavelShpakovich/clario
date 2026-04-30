import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { Ionicons } from '@expo/vector-icons';
import { creditsApi } from '@clario/api-client';
import type { CreditsStoreSnapshot } from '@clario/api-client';
import { useTranslations } from '@/lib/i18n';
import { colors, cardShadow } from '@/lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/Skeleton';

function StoreSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back row */}
      <View style={[styles.backRow, { marginTop: insets.top + 8 }]}>
        <Skeleton width={60} height={16} borderRadius={8} />
      </View>
      <Skeleton width={140} height={24} style={{ marginTop: 12 }} />
      <Skeleton width={'80%'} height={13} style={{ marginTop: 8 }} />

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.balanceInfo}>
          <Skeleton width={80} height={12} />
          <Skeleton width={100} height={22} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Credit packs section */}
      <View style={styles.sectionHeader}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={100} height={15} />
      </View>
      <Skeleton width={'70%'} height={12} style={{ marginBottom: 8 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.packCard}>
          <View style={styles.packInfo}>
            <Skeleton width={90} height={15} />
            <Skeleton width={70} height={12} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={60} height={15} />
        </View>
      ))}

      {/* Credit costs section */}
      <View style={styles.sectionHeader}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={110} height={15} />
      </View>
      <View style={styles.costsCard}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.costRow, i === 3 && styles.costRowLast]}>
            <Skeleton width={'55%'} height={13} />
            <Skeleton width={50} height={13} />
          </View>
        ))}
      </View>

      {/* Transaction history section */}
      <View style={styles.sectionHeader}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={130} height={15} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.historyRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width={'60%'} height={13} />
            <Skeleton width={'40%'} height={11} />
          </View>
          <Skeleton width={50} height={13} />
        </View>
      ))}
    </ScrollView>
  );
}

const REASON_KEYS: Record<string, string> = {
  pack_purchase: 'reasonPackPurchase',
  admin_grant: 'reasonAdminGrant',
  admin_revoke: 'reasonAdminRevoke',
  reading_debit: 'reasonReadingDebit',
  compatibility_debit: 'reasonCompatibilityDebit',
  forecast_pack_debit: 'reasonForecastPackDebit',
  chat_pack_debit: 'reasonChatPackDebit',
  welcome_bonus: 'reasonWelcomeBonus',
  refund_llm_failure: 'reasonRefundLlmFailure',
  refund_admin: 'reasonRefundAdmin',
};

const COST_KEYS: Record<string, string> = {
  natal_report: 'natalReport',
  compatibility_report: 'compatibilityReport',
  forecast_report: 'forecastPack',
  follow_up_pack: 'chatPack',
};

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CreditsStoreSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const tCredits = useTranslations('credits');
  const tErrors = useTranslations('errors');
  const tNav = useTranslations('navigation');

  useEffect(() => {
    async function load() {
      try {
        const snapshot = await creditsApi.getStoreSnapshot({ page, pageSize: PAGE_SIZE });
        setData(snapshot);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page]);

  if (loading) {
    return <StoreSkeleton />;
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{tErrors('generic')}</Text>
      </View>
    );
  }

  const { balance, pricing, packs, history } = data;
  const totalPages = Math.max(1, Math.ceil(history.total / PAGE_SIZE));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back row + page title */}
      <View style={[styles.backRow, { marginTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => goBack('/(tabs)/index')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          <Text style={styles.backText}>{tNav('back')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{tCredits('storeTitle')}</Text>
      <Text style={styles.storeDesc}>{tCredits('storeDescription')}</Text>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconWrap}>
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>{tCredits('yourBalance')}</Text>
          <Text style={styles.balanceValue}>
            {balance.balance} <Text style={styles.balanceUnit}>{tCredits('creditsUnit')}</Text>
          </Text>
          {balance.forecastAccessUntil && (
            <Text style={styles.forecastAccess}>
              {tCredits('forecastAccessActive').replace(
                '{date}',
                new Date(balance.forecastAccessUntil).toLocaleDateString('ru-RU'),
              )}
            </Text>
          )}
        </View>
      </View>

      {/* Credit packs */}
      <View style={styles.sectionHeader}>
        <Ionicons name="cube-outline" size={18} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{tCredits('creditPacks')}</Text>
      </View>
      <Text style={styles.sectionDesc}>{tCredits('betaNote')}</Text>
      {packs.map((pack) => (
        <View key={pack.id} style={styles.packCard}>
          <View style={styles.packInfo}>
            <Text style={styles.packName}>{pack.name}</Text>
            <Text style={styles.packCredits}>
              {tCredits('packCredits').replace('{count}', String(pack.credits))}
            </Text>
          </View>
          <View style={styles.packAction}>
            {pack.priceminor !== null ? (
              <Text style={styles.packPrice}>
                {(pack.priceminor / 100).toFixed(2)} {pack.currency}
              </Text>
            ) : (
              <Text style={styles.comingSoonText}>{tCredits('comingSoon')}</Text>
            )}
          </View>
        </View>
      ))}
      {packs.length === 0 && <View style={styles.packsEmpty} />}

      {/* Credit costs */}
      <View style={styles.sectionHeader}>
        <Ionicons name="flash-outline" size={18} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{tCredits('creditCosts')}</Text>
      </View>
      <View style={styles.costsCard}>
        {Object.entries(pricing.costs)
          .filter(([k]) => COST_KEYS[k])
          .map(([key, cost], index, arr) => (
            <View
              key={key}
              style={[styles.costRow, index === arr.length - 1 && styles.costRowLast]}
            >
              <Text style={styles.costLabel}>
                {tCredits(COST_KEYS[key] as Parameters<typeof tCredits>[0])}
              </Text>
              <Text style={styles.costValue}>
                {pricing.freeProducts.includes(key)
                  ? tCredits('freeLabel')
                  : tCredits('balanceCount').replace('{count}', String(cost))}
              </Text>
            </View>
          ))}
      </View>

      {/* Transaction history */}
      <View style={styles.sectionHeader}>
        <Ionicons name="time-outline" size={18} color={colors.foreground} />
        <Text style={styles.sectionTitle}>{tCredits('purchaseHistory')}</Text>
        {history.total > 0 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageChevron, page <= 1 && styles.pageButtonDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.pageLabel}>
              {tCredits('pageLabel')
                .replace('{current}', String(page))
                .replace('{total}', String(totalPages))}
            </Text>
            <TouchableOpacity
              style={[styles.pageChevron, page >= totalPages && styles.pageButtonDisabled]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {history.transactions.length === 0 ? (
        <Text style={styles.emptyText}>{tCredits('noTransactions')}</Text>
      ) : (
        <View style={styles.historyCard}>
          {history.transactions.map((tx, index) => {
            const reasonKey = REASON_KEYS[tx.reason];
            const reasonLabel = reasonKey
              ? tCredits(reasonKey as Parameters<typeof tCredits>[0])
              : tx.reason;
            return (
              <View
                key={tx.id}
                style={[
                  styles.txRow,
                  index === history.transactions.length - 1 && styles.txRowLast,
                ]}
              >
                <View style={styles.txLeft}>
                  <Text style={styles.txReason}>{reasonLabel}</Text>
                  {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleString('ru-RU')}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[styles.txAmount, tx.amount > 0 ? styles.txPositive : styles.txNegative]}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  // Back row
  backRow: {
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: colors.mutedForeground,
    fontSize: 14,
  },
  // Page title
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
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
  storeDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 20,
    lineHeight: 20,
  },
  // Balance card
  balanceCard: {
    backgroundColor: colors.primarySubtle,
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceInfo: {
    flex: 1,
    gap: 2,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 38,
  },
  balanceUnit: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  forecastAccess: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  // Section headers with icon
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 12,
    lineHeight: 18,
  },
  // Costs card — card style with row dividers
  costsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
    marginBottom: 24,
    overflow: 'hidden',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  costRowLast: {
    borderBottomWidth: 0,
  },
  costLabel: {
    fontSize: 14,
    color: colors.foreground,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Pack cards — card style
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
    padding: 16,
    marginBottom: 8,
  },
  packInfo: {
    flex: 1,
    gap: 2,
  },
  packName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  packCredits: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  packAction: {
    alignItems: 'flex-end',
    gap: 4,
  },
  packPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  comingSoonText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  packsEmpty: {
    marginBottom: 16,
  },
  // Transaction history — card style with row dividers
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
    marginBottom: 8,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  txRowLast: {
    borderBottomWidth: 0,
  },
  txLeft: {
    flex: 1,
    gap: 2,
  },
  txReason: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  txNote: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  txDate: {
    fontSize: 12,
    color: colors.placeholder,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  txPositive: {
    color: colors.success,
  },
  txNegative: {
    color: colors.error,
  },
  // Pagination (inline in section header)
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageChevron: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
    minWidth: 50,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
});
