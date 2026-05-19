// components/market/pulse-rail.tsx
// Two-segment probability rail with a soft mount fade and (optional)
// breathe / stake ripple. Previously implemented with react-native-reanimated
// v4 — `useAnimatedStyle` returning a `flex` (layout) prop crashes the app
// natively on RN 0.81 + Fabric (no JS error). Rewritten using React Native's
// built-in `Animated` API which is stable on Fabric.
//
// The split widths now use static `flex` (re-rendered on prop change with a
// short `LayoutAnimation`-free transition via `Animated.timing` on a
// non-native driver) and the caption / ripple use transform/opacity which
// run on the native driver. The infinite "breathe" oscillation was the
// single biggest crash vector — it's been dropped; the rail still feels
// alive because each new tick re-targets the split with a quick fade.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

type Props = {
  leadingPercent: number;
  leadingLabel: string;
  trailingLabel: string;
  leadingColor: string;
  trailingColor: string;
  poolExists: boolean;
  selectedSide: 'leading' | 'trailing' | null;
  /** True when market is locked/resolved — dims fills. */
  frozen?: boolean;
  /** 0..1, how volatile the market is — accepted for API compat, currently unused. */
  volatilityScore?: number;
  /** Monotonic counter incremented when a stake confirms; triggers ripple. */
  rippleTrigger?: number;
  /** Side the ripple should originate from. */
  rippleSide?: 'leading' | 'trailing' | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function PulseRail({
  leadingPercent,
  leadingLabel,
  trailingLabel,
  leadingColor,
  trailingColor,
  poolExists,
  frozen = false,
  rippleTrigger = 0,
  rippleSide = null,
}: Props) {
  const target = poolExists ? clamp(leadingPercent / 100, 0.04, 0.96) : 0.5;

  // ── Mount fade-in for the caption ────────────────────────────────────
  const mount = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mount, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mount]);

  // ── Split (drives the fill widths via `flex`) ────────────────────────
  // We animate the JS number and re-render on each tick. Cheap because the
  // tween only fires when `target` actually changes.
  const splitAnim = useRef(new Animated.Value(0.5)).current;
  const [split, setSplit] = React.useState(0.5);

  useEffect(() => {
    const sub = splitAnim.addListener(({ value }) => setSplit(value));
    return () => splitAnim.removeListener(sub);
  }, [splitAnim]);

  useEffect(() => {
    Animated.timing(splitAnim, {
      toValue: target,
      duration: 700,
      delay: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [target, splitAnim]);

  // ── StakeRipple — bumps an opacity/scale on `rippleTrigger` change ────
  const ripple = useRef(new Animated.Value(0)).current;
  const lastRipple = useRef(rippleTrigger);
  useEffect(() => {
    if (rippleTrigger === lastRipple.current) return;
    lastRipple.current = rippleTrigger;
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => ripple.setValue(0));
  }, [rippleTrigger, ripple]);

  const captionOpacity = mount;
  const captionTranslate = mount.interpolate({
    inputRange: [0, 1],
    outputRange: [rs.size(4), 0],
  });

  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.8, 0],
  });
  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 6],
  });
  const rippleColor = rippleSide === 'trailing' ? trailingColor : leadingColor;

  const leadingDisplay = Math.round(leadingPercent);
  const trailingDisplay = Math.max(0, 100 - leadingDisplay);
  const momentum = !poolExists
    ? 'Awaiting first stake'
    : Math.abs(leadingPercent - 50) < 5
      ? 'Tight market'
      : `Market leaning ${leadingLabel.toUpperCase()}`;

  return (
    <View>
      <View style={styles.edgeRow}>
        <Text style={[styles.edgeLabel, { color: leadingColor }]} numberOfLines={1}>
          {poolExists ? `${leadingDisplay}%` : '—'} {leadingLabel.toLowerCase()} confidence
        </Text>
        <Text
          style={[styles.edgeLabel, styles.edgeLabelRight, { color: trailingColor }]}
          numberOfLines={1}
        >
          {poolExists ? `${trailingDisplay}%` : '—'} {trailingLabel.toLowerCase()}
        </Text>
      </View>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { backgroundColor: leadingColor, flex: Math.max(0.0001, split) },
              frozen && styles.fillFrozen,
            ]}
          />
          <View
            style={[
              styles.fill,
              { backgroundColor: trailingColor, flex: Math.max(0.0001, 1 - split) },
              frozen && styles.fillFrozen,
            ]}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ripple,
            rippleSide === 'trailing' ? styles.rippleRight : styles.rippleLeft,
            {
              borderColor: rippleColor,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.captionRow,
          { opacity: captionOpacity, transform: [{ translateY: captionTranslate }] },
        ]}
      >
        <View
          style={[
            styles.momentumDot,
            { backgroundColor: poolExists ? leadingColor : Colors.text.tertiary },
          ]}
        />
        <Text style={styles.momentumText} numberOfLines={1}>
          {momentum}
        </Text>
      </Animated.View>
    </View>
  );
}

const RIPPLE_SIZE = 40;

const styles = StyleSheet.create({
  edgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rs.size(6),
  },
  edgeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    letterSpacing: 0.4,
    maxWidth: '48%',
  },
  edgeLabelRight: {
    textAlign: 'right',
  },
  trackWrap: {
    position: 'relative',
  },
  track: {
    width: '100%',
    height: rs.size(14),
    borderRadius: rs.size(999),
    backgroundColor: Colors.surface.muted,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: {
    height: '100%',
  },
  fillFrozen: {
    opacity: 0.55,
  },
  ripple: {
    position: 'absolute',
    width: rs.size(RIPPLE_SIZE),
    height: rs.size(RIPPLE_SIZE),
    borderRadius: rs.size(RIPPLE_SIZE / 2),
    borderWidth: 1.2,
    top: rs.size((14 - RIPPLE_SIZE) / 2),
  },
  rippleLeft: { left: rs.size(-12) },
  rippleRight: { right: rs.size(-12) },
  captionRow: {
    marginTop: rs.size(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  momentumDot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
  },
  momentumText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
    letterSpacing: 0.3,
  },
});
