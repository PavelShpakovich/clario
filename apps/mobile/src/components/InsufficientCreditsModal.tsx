import { useMemo, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/colors';
import { useTranslations } from '@/lib/i18n';
import { openStore, routes } from '@/lib/navigation';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  /** How many credits are required (optional — shows richer message when provided) */
  required?: number;
  /** User's current balance (optional) */
  balance?: number;
  onClose: () => void;
}

export function InsufficientCreditsModal({ visible, required, balance, onClose }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useTranslations('credits');

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  function handleGoToStore() {
    onClose();
    // Small delay so the modal closes before navigating
    setTimeout(() => {
      openStore(routes.tabs.home);
    }, 250);
  }

  const description =
    required !== undefined && balance !== undefined
      ? t('insufficientDescription', { required, balance })
      : (t('insufficientDescriptionShort' as Parameters<typeof t>[0]) ?? t('insufficientTitle'));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Icon badge */}
          <View style={styles.iconBadge}>
            <Ionicons name="wallet-outline" size={32} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('insufficientTitle')}</Text>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Balance pill */}
          {balance !== undefined && (
            <View style={styles.balancePill}>
              <Ionicons name="wallet" size={14} color={colors.primary} />
              <Text style={styles.balancePillText}>
                {balance} {t('creditsUnit')}
              </Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleGoToStore} activeOpacity={0.85}>
            <Ionicons name="storefront-outline" size={18} color={colors.primaryForeground} />
            <Text style={styles.ctaText}>{t('goToStore')}</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.dismissText}>
              {t('dismiss' as Parameters<typeof t>[0]) ?? 'Отмена'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheetWrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      alignItems: 'center',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 24,
    },
    iconBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
    balancePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
      marginBottom: 24,
    },
    balancePillText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      width: '100%',
      paddingVertical: 15,
      marginBottom: 10,
    },
    ctaText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryForeground,
    },
    dismissButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    dismissText: {
      fontSize: 15,
      color: colors.mutedForeground,
    },
  });
}
