// components/portfolio/HistoryRow.tsx
//
// Settled-bet row for the Won / Lost tabs. Uses the system motion library
// (`PressableSpring`, `CardEnter` fade-up, 4dp coloured ribbon keyed on the
// settled status) so the portfolio reads as a system, not a stack of one-offs.
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
import { timeAgo } from '@/utils/market';
import { rs } from '@/utils/responsive';
import type { MyBet } from '@/features/betting/api/betting-api';

const RIBBON_W = 4;

export interface PortfolioHistoryRowProps {
  bet: MyBet;
  index: number;
}

export const PortfolioHistoryRow: React.FC<PortfolioHistoryRowProps> = ({
  bet,
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

  const isWon = bet.status === 'won';
  const isLost = bet.status === 'lost';
  const colour = isWon
    ? Colors.status.win
    : isLost
      ? Colors.status.loss
      : Colors.brand;
  const statusLabel = isWon ? 'WON' : isLost ? 'LOST' : 'OPEN';
  const payout = bet.payoutKobo ?? '0';

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInUp.delay(index * 30).duration(220)}
    >
      <PressableSpring
        onPress={() => router.push(`/market/${bet.marketSlug}`)}
        haptic="tap"
        accessibilityLabel={`${statusLabel} bet on ${bet.marketQuestion}`}
      >
        <View style={styles.row}>
          <Animated.View
            style={[styles.ribbon, { backgroundColor: colour }, ribbonStyle]}
          />
          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text style={styles.question} numberOfLines={2}>
                {bet.marketQuestion}
              </Text>
              <View style={[styles.statusPill, { borderColor: colour }]}>
                <Text style={[styles.statusText, { color: colour }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.outcome} numberOfLines={1}>
              {bet.outcomeLabel}
              {bet.multiplier !== null ? (
                <Text style={styles.dim}> · {bet.multiplier}x</Text>
              ) : null}
            </Text>

            <View style={styles.metaRow}>
              <Meta label="STAKE" value={`₦${formatKoboAsNaira(bet.stakeKobo)}`} />
              <Meta
                label={isWon ? 'PAYOUT' : 'POTENTIAL'}
                value={`₦${formatKoboAsNaira(payout)}`}
                tint={isWon ? colour : undefined}
                dim={isLost}
              />
              <Text style={styles.time}>{timeAgo(bet.createdAt)}</Text>
            </View>
          </View>
        </View>
      </PressableSpring>
    </Animated.View>
  );
};

function Meta({
  label,
  value,
  tint,
  dim,
}: {
  label: string;
  value: string;
  tint?: string;
  dim?: boolean;
}) {
  return (
    <View>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text
        style={[
          styles.metaValue,
          tint ? { color: tint } : null,
          dim && styles.dim,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(10),
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(14),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ribbon: { alignSelf: 'stretch' },
  body: { flex: 1, padding: rs.size(14) },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(10),
  },
  question: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
    lineHeight: rs.font(19),
  },
  statusPill: {
    borderRadius: rs.size(6),
    borderWidth: 1,
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.8,
  },
  outcome: {
    marginTop: rs.size(8),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
  },
  dim: {
    color: Colors.text.tertiary,
    fontFamily: Fonts.regular,
  },
  metaRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(20),
  },
  metaLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 0.6,
  },
  metaValue: {
    marginTop: rs.size(2),
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
  },
  time: {
    marginLeft: 'auto',
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
});
