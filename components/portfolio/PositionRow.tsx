// components/portfolio/PositionRow.tsx
//
// Portfolio "open position" row. Camp-coloured 4dp ribbon (width animates
// 0→4dp on mount via `time.emphasis`), `CardEnter` fade-up, `PressableSpring`
// for tap → market detail.  Identity colour falls back to brand because the
// MyBet shape carries no `marketCategory` field.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';
import {
  type Position,
  estimatePayoutKobo,
} from '@/features/betting/utils/positions';

const RIBBON_W = 4;

export interface PortfolioPositionRowProps {
  position: Position;
  /** Index within the rendered list — drives the ribbon stagger. */
  index: number;
}

function pickRibbonColor(outcomeLabel: string): string {
  const s = outcomeLabel.trim().toLowerCase();
  if (
    s === 'no' ||
    s.startsWith('no ') ||
    s.startsWith("won't") ||
    s.startsWith('wont') ||
    s.startsWith('lose')
  ) {
    return Colors.category.sports.primary;
  }
  return Colors.category.politics.primary;
}

export const PortfolioPositionRow: React.FC<PortfolioPositionRowProps> = ({
  position,
  index,
}) => {
  const router = useRouter();
  const reduced = useReducedMotion();
  const ribbon = useSharedValue(reduced ? rs.size(RIBBON_W) : 0);

  useEffect(() => {
    if (reduced) {
      ribbon.value = rs.size(RIBBON_W);
      return;
    }
    ribbon.value = withDelay(
      index * 40,
      withTiming(rs.size(RIBBON_W), time.emphasis)
    );
  }, [reduced, index, ribbon]);

  const ribbonStyle = useAnimatedStyle(() => ({ width: ribbon.value }));
  const colour = pickRibbonColor(position.outcomeLabel);
  const payout = estimatePayoutKobo(
    position.totalStakeKobo,
    position.latestMultiplier
  );

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInUp.delay(index * 30).duration(220)}
    >
      <PressableSpring
        onPress={() => router.push(`/market/${position.marketSlug}`)}
        haptic="tap"
        accessibilityLabel={`Open position on ${position.marketQuestion}`}
        accessibilityHint="Opens the market detail to add or review your stake"
      >
        <View style={styles.row}>
          <Animated.View
            style={[styles.ribbon, { backgroundColor: colour }, ribbonStyle]}
          />
          <View style={styles.body}>
            <Text style={styles.question} numberOfLines={2}>
              {position.marketQuestion}
            </Text>
            <Text style={styles.outcome} numberOfLines={1}>
              {position.outcomeLabel}
              {position.latestMultiplier !== null ? (
                <Text style={styles.multiplier}>
                  {' · '}
                  {position.latestMultiplier}x
                </Text>
              ) : null}
            </Text>

            <View style={styles.stats}>
              <Stat label="STAKED" value={`₦${formatKoboAsNaira(position.totalStakeKobo)}`} />
              <Stat
                label="POTENTIAL"
                value={`₦${formatKoboAsNaira(payout)}`}
                accent
              />
              <Stat
                label="ENTRIES"
                value={String(position.entryCount)}
              />
            </View>
          </View>
        </View>
      </PressableSpring>
    </Animated.View>
  );
};

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statCol}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && styles.statAccent]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(12),
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ribbon: {
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    padding: rs.size(16),
  },
  question: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
    lineHeight: rs.font(20),
  },
  outcome: {
    marginTop: rs.size(6),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
  multiplier: {
    fontFamily: Fonts.bold,
    color: Colors.brand,
  },
  stats: {
    marginTop: rs.size(14),
    paddingTop: rs.size(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.s02,
    flexDirection: 'row',
    gap: rs.size(16),
  },
  statCol: { flex: 1 },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: rs.size(4),
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
  },
  statAccent: { color: Colors.brand },
});
