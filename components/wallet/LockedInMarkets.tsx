// components/wallet/LockedInMarkets.tsx
// War-chest breakdown: every active position the user holds, grouped into
// YES/NO camps with a coloured side-ribbon on each row. The ribbon
// width-animates from 0 → 4dp on mount (`time.emphasis`) per the redesign
// motion spec. Row presses are routed through `PressableSpring` so taps
// land on the market detail with a uniform `ButtonPress` haptic.
import React, { useEffect, useMemo } from 'react';
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
import type { Position } from '@/features/betting';
import type { LockedCamp } from '@/features/betting/api/wallet-locked-api';

const RIBBON_W = 4;

export interface LockedInMarketsProps {
  /** Client-derived positions (one row per market × outcome). */
  positions?: Position[];
  /**
   * BACKEND.md §13 — server aggregate. When provided this is preferred over
   * `positions` because it (a) doesn't truncate at the /me/bets paging limit
   * and (b) carries the denormalized `camp.color` instead of falling back to
   * the YES/NO heuristic.
   */
  camps?: LockedCamp[];
}

function campToPosition(camp: LockedCamp): Position {
  return {
    marketId: camp.marketId,
    marketQuestion: camp.marketQuestion,
    marketSlug: camp.marketSlug,
    outcomeId: camp.outcomeId,
    outcomeLabel: camp.outcomeLabel,
    totalStakeKobo: camp.lockedKobo,
    entryCount: 1,
    latestMultiplier: null,
    lastBetAt: new Date(0).toISOString(),
    campColor: camp.color,
    campLabel: camp.outcomeLabel,
  };
}

type Camp = 'yes' | 'no';

function classifyCamp(outcomeLabel: string): Camp {
  // Heuristic used only as a defensive fallback when the bet payload does
  // not carry a denormalized `camp` triplet from the server (BACKEND.md §13).
  const s = outcomeLabel.trim().toLowerCase();
  if (
    s === 'no' ||
    s.startsWith('no ') ||
    s.startsWith("won't") ||
    s.startsWith('wont') ||
    s.startsWith("doesn't") ||
    s.startsWith('does not') ||
    s.startsWith('lose')
  ) {
    return 'no';
  }
  return 'yes';
}

const CAMP_META: Record<Camp, { color: string; label: string }> = {
  yes: { color: Colors.category.politics.primary, label: 'YES' },
  no: { color: Colors.category.sports.primary, label: 'NO' },
};

// Server camp wins when present, otherwise we fall back to the heuristic.
function resolveCamp(position: Position): { color: string; label: string } {
  if (position.campColor && position.campLabel) {
    return { color: position.campColor, label: position.campLabel.toUpperCase() };
  }
  const camp = classifyCamp(position.outcomeLabel);
  return CAMP_META[camp];
}

function sumKobo(positions: Position[]): bigint {
  let total = 0n;
  for (const p of positions) {
    try {
      total += BigInt(p.totalStakeKobo);
    } catch {
      // ignore malformed kobo strings
    }
  }
  return total;
}

export const LockedInMarkets: React.FC<LockedInMarketsProps> = ({
  positions,
  camps,
}) => {
  const router = useRouter();

  // Server camps win when present (correct math, denormalized colours).
  // Fall back to client-derived positions when the endpoint is unavailable.
  const rows: Position[] = useMemo(() => {
    if (camps && camps.length > 0) return camps.map(campToPosition);
    return positions ?? [];
  }, [camps, positions]);

  // Group positions by camp label (server-provided when available, else
  // YES/NO heuristic). The summary row shows one chip per distinct camp.
  const groups = useMemo(() => {
    const map = new Map<string, { color: string; label: string; items: Position[] }>();
    for (const p of rows) {
      const c = resolveCamp(p);
      const existing = map.get(c.label);
      if (existing) existing.items.push(p);
      else map.set(c.label, { color: c.color, label: c.label, items: [p] });
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      totalKobo: sumKobo(g.items).toString(),
    }));
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>LOCKED IN MARKETS</Text>

      <View style={styles.summaryRow}>
        {groups.map((g) => (
          <SummaryChip
            key={g.label}
            colour={g.color}
            label={`₦${formatKoboAsNaira(g.totalKobo)}`}
            sub={`${g.items.length} ${g.label} camp${g.items.length === 1 ? '' : 's'}`}
          />
        ))}
      </View>

      <View style={styles.list}>
        {rows.map((p, i) => (
          <PositionTile
            key={`${p.marketId}-${p.outcomeId}`}
            position={p}
            indexInGroup={i}
            onPress={() => router.push(`/market/${p.marketSlug}`)}
          />
        ))}
      </View>
    </View>
  );
};

function SummaryChip({
  colour,
  label,
  sub,
}: {
  colour: string;
  label: string;
  sub: string;
}) {
  return (
    <View style={styles.summaryChip}>
      <View style={[styles.summaryDot, { backgroundColor: colour }]} />
      <View>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summarySub}>{sub}</Text>
      </View>
    </View>
  );
}

function PositionTile({
  position,
  indexInGroup,
  onPress,
}: {
  position: Position;
  indexInGroup: number;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const camp = resolveCamp(position);
  const colour = camp.color;

  // Ribbon mount: width 0 → 4dp via `time.emphasis`. Staggered per index so
  // the eye reads the list as growing in, not slamming in.
  const ribbon = useSharedValue(reduced ? rs.size(RIBBON_W) : 0);
  useEffect(() => {
    if (reduced) {
      ribbon.value = rs.size(RIBBON_W);
      return;
    }
    ribbon.value = withDelay(
      indexInGroup * 40,
      withTiming(rs.size(RIBBON_W), time.emphasis)
    );
  }, [reduced, indexInGroup, ribbon]);

  const ribbonStyle = useAnimatedStyle(() => ({ width: ribbon.value }));

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInUp.delay(indexInGroup * 30).duration(220)}
    >
      <PressableSpring
        onPress={onPress}
        haptic="tap"
        accessibilityLabel={`${camp.label} position on ${position.marketQuestion}`}
        accessibilityHint="Opens the market"
      >
        <View style={styles.tile}>
          <Animated.View
            style={[styles.ribbon, { backgroundColor: colour }, ribbonStyle]}
          />
          <View style={styles.tileBody}>
            <Text style={styles.tileQuestion} numberOfLines={1}>
              {position.marketQuestion}
            </Text>
            <Text style={styles.tileOutcome} numberOfLines={1}>
              {camp.label} · {position.outcomeLabel}
            </Text>
          </View>
          <Text style={styles.tileAmount} numberOfLines={1}>
            ₦{formatKoboAsNaira(position.totalStakeKobo)}
          </Text>
        </View>
      </PressableSpring>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: rs.size(24),
  },
  heading: {
    marginHorizontal: rs.size(20),
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 1.2,
  },
  summaryRow: {
    marginTop: rs.size(10),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    gap: rs.size(8),
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(8),
    borderRadius: rs.size(12),
    backgroundColor: Colors.surface['01'],
    borderWidth: 1,
    borderColor: Colors.border.s01,
  },
  summaryDot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
  },
  summaryLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
  },
  summarySub: {
    marginTop: rs.size(1),
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 0.4,
  },
  list: {
    marginTop: rs.size(8),
  },
  tile: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(12),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    overflow: 'hidden',
  },
  ribbon: {
    alignSelf: 'stretch',
  },
  tileBody: {
    flex: 1,
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(12),
    gap: rs.size(2),
  },
  tileQuestion: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
  },
  tileOutcome: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 0.4,
  },
  tileAmount: {
    paddingRight: rs.size(14),
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
  },
});
