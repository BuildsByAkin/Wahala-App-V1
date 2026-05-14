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
  frozen?: boolean;
};

export function PulseRail({
  leadingPercent,
  leadingLabel,
  trailingLabel,
  leadingColor,
  trailingColor,
  poolExists,
  frozen = false,
}: Props) {
  // Mount fade (native driver)
  const mount = useRef(new Animated.Value(0)).current;
  // Split position 0..1 (NOT native driver — drives layout width)
  const split = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.timing(mount, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mount]);

  useEffect(() => {
    const target = poolExists ? Math.max(0.04, Math.min(0.96, leadingPercent / 100)) : 0.5;
    Animated.spring(split, {
      toValue: target,
      damping: 18,
      stiffness: 160,
      mass: 0.9,
      useNativeDriver: false,
      delay: 120,
    }).start();
  }, [leadingPercent, poolExists, split]);

  const leadWidth = split.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const trailWidth = split.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%'],
  });
  const captionTranslateY = mount.interpolate({
    inputRange: [0, 1],
    outputRange: [rs.size(4), 0],
  });

  const leadingDisplay = Math.round(leadingPercent);
  const trailingDisplay = Math.max(0, 100 - leadingDisplay);
  const momentum =
    !poolExists
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
        <Text style={[styles.edgeLabel, styles.edgeLabelRight, { color: trailingColor }]} numberOfLines={1}>
          {poolExists ? `${trailingDisplay}%` : '—'} {trailingLabel.toLowerCase()}
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: leadingColor, width: leadWidth },
            frozen && styles.fillFrozen,
          ]}
        />
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: trailingColor, width: trailWidth },
            frozen && styles.fillFrozen,
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.captionRow,
          { opacity: mount, transform: [{ translateY: captionTranslateY }] },
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

const styles = StyleSheet.create({
  edgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rs.size(12),
    marginBottom: rs.size(10),
  },
  edgeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  edgeLabelRight: { textAlign: 'right' },
  track: {
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
