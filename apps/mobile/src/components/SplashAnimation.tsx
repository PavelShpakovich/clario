import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useColors } from '@/lib/colors';

/**
 * Minimal splash shown while auth initialises.
 * Sequence:
 *  0 ms   — background appears instantly (covers the native splash)
 * 100 ms  — inner dot fades in
 * 200 ms  — ring 1 pulses outward and fades
 * 500 ms  — ring 2 pulses outward and fades
 * 900 ms  — ring 3 pulses outward and fades
 * 1300 ms — everything fades out (onDone called)
 */
export function SplashAnimation({ onDone }: { onDone: () => void }) {
  const c = useColors();

  const bgOpacity = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(0.3)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.3)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  function makePulse(scale: Animated.Value, opacity: Animated.Value, delay: number) {
    return Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 2.6,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
  }

  useEffect(() => {
    Animated.sequence([
      // Dot appears
      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: 200,
        delay: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // 3 staggered pulse rings
      Animated.stagger(300, [
        makePulse(ring1Scale, ring1Opacity, 0),
        makePulse(ring2Scale, ring2Opacity, 0),
        makePulse(ring3Scale, ring3Opacity, 0),
      ]),
      // Fade out
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: c.background, opacity: bgOpacity }]}
      pointerEvents="none"
    >
      {/* Pulse ring 3 (outermost) */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: c.primary,
            opacity: ring3Opacity,
            transform: [{ scale: ring3Scale }],
          },
        ]}
      />
      {/* Pulse ring 2 */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: c.primary,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      {/* Pulse ring 1 (innermost) */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: c.primary,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      {/* Centre dot */}
      <Animated.View style={[styles.dot, { backgroundColor: c.primary, opacity: dotOpacity }]} />
    </Animated.View>
  );
}

const DOT_SIZE = 14;
const RING_SIZE = 80;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
