// app/(tabs)/portfolio.tsx
//
// Portfolio = trophy room. Record hero (W—L, win%, streak) + all-time P&L
// sparkline + Active/Won/Lost tabs with a spring-driven indicator and a
// cross-fading content pane.
import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RNAnimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useAppSelector } from '@/store';
import { useAuth } from '@/features/auth';
import {
  groupBetsIntoPositions,
  useMyBets,
  useMyBetsSummary,
} from '@/features/betting';
import { haptic } from '@/lib/motion/haptics';
import {
  AllTimeSparkline,
  BalanceSummary,
  PortfolioHistoryRow,
  PortfolioPositionRow,
  PortfolioTabBar,
  type PortfolioTabKey,
} from '@/components/portfolio';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export default function PortfolioScreen() {
  const router = useRouter();
  const { username, displayName } = useAuth();
  const walletAvailableKobo = useAppSelector((s) => s.auth.walletAvailableKobo);
  const walletLockedKobo = useAppSelector((s) => s.auth.walletLockedKobo);
  const [active, setActive] = useState<PortfolioTabKey>('active');

  const onDepositPress = useCallback(() => {
    haptic.medium();
    router.push('/wallet/deposit');
  }, [router]);

  // Pull all three lists up-front — we need wins/losses for the RecordHero
  // even when the Active tab is foregrounded. Limits are kept reasonable.
  const activeQuery = useMyBets({ status: 'active', limit: 50 });
  const wonQuery = useMyBets({ status: 'won', limit: 100 });
  const lostQuery = useMyBets({ status: 'lost', limit: 100 });
  // BACKEND.md §14 — server-authoritative W—L + 30d sparkline. When the
  // backend exposes these we let them win over the client-side computation
  // below; older deploys fall through to the per-bet aggregation.
  const summary = useMyBetsSummary();

  const positions = useMemo(
    () => groupBetsIntoPositions(activeQuery.bets),
    [activeQuery.bets]
  );

  // P&L series = cumulative naira P&L across every settled bet, oldest first.
  const series = useMemo(() => {
    const settled = [...wonQuery.bets, ...lostQuery.bets].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cum = 0n;
    const pts: number[] = settled.length > 0 ? [0] : [];
    for (const b of settled) {
      try {
        const stake = BigInt(b.stakeKobo);
        const payout = BigInt(b.payoutKobo ?? '0');
        const pnl =
          b.status === 'won'
            ? payout - stake
            : b.status === 'lost'
              ? -stake
              : 0n;
        cum += pnl;
        pts.push(Number(cum / 100n));
      } catch {
        // ignore parse failures
      }
    }
    return pts;
  }, [wonQuery.bets, lostQuery.bets]);

  const displaySeries =
    summary.netProfitSparkline && summary.netProfitSparkline.length > 0
      ? summary.netProfitSparkline
      : series;

  // Net profit from settled wins (payout − stake), summed in kobo. Prefer the
  // server-authoritative all-time net profit when present (it accounts for
  // losses too, which "won" displays — keep this client value as a fallback
  // when the backend hasn't rolled out the optional field yet).
  const wonKoboFallback = useMemo(() => {
    let total = 0n;
    for (const b of wonQuery.bets) {
      try {
        const stake = BigInt(b.stakeKobo);
        const payout = BigInt(b.payoutKobo ?? '0');
        const pnl = payout - stake;
        if (pnl > 0n) total += pnl;
      } catch {
        // ignore parse failures
      }
    }
    return total.toString();
  }, [wonQuery.bets]);

  const wonKobo = summary.netProfitKoboAllTime ?? wonKoboFallback;
  // Prefer the wallet's locked balance (authoritative) over the summary
  // active stake — they agree in steady state but the wallet updates instantly
  // on optimistic bet placement via the auth slice.
  const stakedKobo = walletLockedKobo ?? summary.activeStakeKobo ?? '0';

  const handle = username || displayName || 'you';
  const initials = useMemo(
    () => initialsFor(displayName || username || 'W'),
    [displayName, username]
  );

  type Row =
    | { kind: 'position'; data: ReturnType<typeof groupBetsIntoPositions>[number] }
    | { kind: 'history'; data: ReturnType<typeof useMyBets>['bets'][number] };

  const rows: Row[] = useMemo(() => {
    if (active === 'active') {
      return positions.map((p) => ({ kind: 'position' as const, data: p }));
    }
    const list = active === 'won' ? wonQuery.bets : lostQuery.bets;
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.map((b) => ({ kind: 'history' as const, data: b }));
  }, [active, positions, wonQuery.bets, lostQuery.bets]);

  const renderRow = useCallback(
    ({ item, index }: { item: Row; index: number }) =>
      item.kind === 'position' ? (
        <PortfolioPositionRow position={item.data} index={index} />
      ) : (
        <PortfolioHistoryRow bet={item.data} index={index} />
      ),
    []
  );

  const paneState =
    active === 'active'
      ? {
          isLoading: activeQuery.isLoading,
          isError: activeQuery.isError,
          onRetry: activeQuery.refetch,
        }
      : active === 'won'
        ? {
            isLoading: wonQuery.isLoading,
            isError: wonQuery.isError,
            onRetry: wonQuery.refetch,
          }
        : {
            isLoading: lostQuery.isLoading,
            isError: lostQuery.isError,
            onRetry: lostQuery.refetch,
          };

  const isRefreshing =
    activeQuery.isRefetching ||
    wonQuery.isRefetching ||
    lostQuery.isRefetching;

  const onRefresh = useCallback(() => {
    activeQuery.refetch();
    wonQuery.refetch();
    lostQuery.refetch();
  }, [activeQuery, wonQuery, lostQuery]);

  const ListHeader = (
    <View>
      <View style={styles.identityRow}>
        <View style={styles.identityLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.handleText} numberOfLines={1}>
            {handle}
          </Text>
        </View>
        <Pressable
          onPress={onDepositPress}
          style={({ pressed }) => [
            styles.depositButton,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Deposit funds"
          accessibilityHint="Opens the deposit screen"
        >
          <Feather name="plus" size={rs.font(14)} color={Colors.text.onAction} />
          <Text style={styles.depositText}>Deposit</Text>
        </Pressable>
      </View>

      <BalanceSummary
        availableKobo={walletAvailableKobo}
        stakedKobo={stakedKobo}
        wonKobo={wonKobo}
      />

      <AllTimeSparkline series={displaySeries} />

      <PortfolioTabBar active={active} onChange={setActive} />

      {paneState.isLoading ? <ListSkeleton /> : null}
    </View>
  );

  const ListEmpty = !paneState.isLoading
    ? paneState.isError
      ? <ErrorState onRetry={paneState.onRetry} />
      : active === 'active'
        ? (
            <EmptyState
              icon="trending-up"
              title="No open positions"
              hint="Wetin you bet on go show here. Open a market to lock in."
            />
          )
        : active === 'won'
          ? (
              <EmptyState
                icon="award"
                title="No wins yet"
                hint="When your markets resolve in your favour, the trophies land here."
              />
            )
          : (
              <EmptyState
                icon="x-circle"
                title="No losses logged"
                hint="Clean record — long may it last."
              />
            )
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <RNAnimated.View
        key={active}
        style={styles.flex}
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(120)}
      >
        <FlashList
          data={paneState.isLoading ? [] : rows}
          renderItem={renderRow}
          keyExtractor={(r) =>
            r.kind === 'position'
              ? `p-${r.data.marketId}-${r.data.outcomeId}`
              : `h-${r.data.id}`
          }
          getItemType={(r) => r.kind}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brand}
            />
          }
        />
      </RNAnimated.View>
    </SafeAreaView>
  );
}

function ListSkeleton() {
  return (
    <View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Feather name="alert-circle" size={rs.font(22)} color={Colors.status.loss} />
      </View>
      <Text style={styles.emptyTitle}>Couldn&apos;t load your bets</Text>
      <Text style={styles.emptyHint} numberOfLines={2}>
        Check your connection and try again.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={({ pressed }) => [
          styles.retryButton,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  hint: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Feather name={icon} size={rs.font(22)} color={Colors.text.secondary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint} numberOfLines={2}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface['00'] },
  flex: { flex: 1 },
  contentContainer: { paddingBottom: rs.size(120) },
  identityRow: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    flexShrink: 1,
  },
  avatar: {
    width: rs.size(40),
    height: rs.size(40),
    borderRadius: rs.size(20),
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.onAction,
  },
  handleText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(16),
    color: Colors.text.primary,
    flexShrink: 1,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    backgroundColor: Colors.brand,
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(8),
    borderRadius: rs.size(9999),
  },
  depositText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.onAction,
  },
  emptyState: {
    marginTop: rs.size(48),
    alignItems: 'center',
    paddingHorizontal: rs.size(32),
  },
  emptyIconCircle: {
    width: rs.size(48),
    height: rs.size(48),
    borderRadius: rs.size(24),
    backgroundColor: Colors.surface['01'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: rs.size(16),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(16),
    color: Colors.text.secondary,
  },
  emptyHint: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: rs.size(16),
    paddingHorizontal: rs.size(20),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(9999),
    backgroundColor: Colors.surface['02'],
    borderWidth: 1,
    borderColor: Colors.border.s02,
  },
  retryText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
    letterSpacing: 0.4,
  },
  skeletonRow: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(12),
    height: rs.size(120),
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: Colors.border.s01,
  },
});
