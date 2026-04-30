import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useColors } from '@/lib/colors';
import { useTranslations } from '@/lib/i18n';

/**
 * Full-screen animated splash shown while auth initialises.
 * Sequence:
 *  0 ms   — background fades in instantly (covers the native splash)
 *  100 ms — logo circle scales up from 0.3 → 1.05, fades in
 *  550 ms — logo settles to scale 1.0 with a soft spring bounce
 *  700 ms — tagline text fades in and slides up 8 px
 * 1 400 ms — everything fades out together (onDone called)
 */
export function SplashAnimation({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const t = useTranslations('splash');

  const bgOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(12)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Phase 1 — logo appears
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 380,
          delay: 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.08,
          duration: 400,
          delay: 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Phase 2 — logo settles + ring pulses out
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringOpacity, {
              toValue: 0.35,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ringScale, {
              toValue: 1.7,
              duration: 500,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // tagline slides in
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 320,
            delay: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslate, {
            toValue: 0,
            duration: 320,
            delay: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Hold
      Animated.delay(500),
      // Phase 3 — fade out
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: c.background, opacity: bgOpacity }]}
      pointerEvents="none"
    >
      {/* Outer decorative circle */}
      <View style={[styles.outerRing, { borderColor: c.primaryTint }]} />

      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: c.primary,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Logo circle */}
      <Animated.View
        style={[
          styles.logoCircle,
          {
            backgroundColor: c.primaryTint,
            borderColor: c.primary,
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Stylised star / compass icon made from pure Views */}
        <StarMark color={c.primary} />
      </Animated.View>

      {/* App name */}
      <Animated.Text
        style={[
          styles.appName,
          {
            color: c.foreground,
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        {t('appName')}
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={[
          styles.tagline,
          {
            color: c.mutedForeground,
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        {t('tagline')}
      </Animated.Text>
    </Animated.View>
  );
}

/** Simple golden star/asterisk drawn with rotated bars */
function StarMark({ color }: { color: string }) {
  const bars = [0, 45, 90, 135];
  return (
    <View style={styles.starWrap}>
      {bars.map((deg) => (
        <View
          key={deg}
          style={[styles.starBar, { backgroundColor: color, transform: [{ rotate: `${deg}deg` }] }]}
        />
      ))}
      {/* centre dot */}
      <View style={[styles.starDot, { backgroundColor: color }]} />
    </View>
  );
}

const LOGO_SIZE = 96;
const RING_SIZE = LOGO_SIZE * 1.5;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  outerRing: {
    position: 'absolute',
    width: RING_SIZE * 1.5,
    height: RING_SIZE * 1.5,
    borderRadius: RING_SIZE,
    borderWidth: 1,
    opacity: 0.25,
  },
  pulseRing: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 2,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9A6500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  appName: {
    marginTop: 28,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.8,
  },
  // Star mark
  starWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starBar: {
    position: 'absolute',
    width: 3,
    height: 36,
    borderRadius: 2,
    opacity: 0.9,
  },
  starDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
