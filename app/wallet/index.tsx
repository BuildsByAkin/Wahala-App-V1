// app/wallet/index.tsx
// Wallet home — the war-chest dashboard. Hero balance (RollingNumber),
// today's earnings sparkline, a 2x2 action grid (Deposit / Withdraw /
// Portfolio / History), and a per-camp breakdown of locked-in markets.
//
// Today's earnings are derived client-side from settled bets in the last
// 24 hours since no `/me/wallet/timeline` endpoint exists yet. The
// component degrades gracefully when no settled history is present.
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

import { useAuth } from '@/features/auth';
import {
  groupBetsIntoPositions,
  useMyBets,
} from '@/features/betting';
import { useLockedByCamp } from '@/features/betting/hooks/use-locked-by-camp';

import { PressableSpring } from '@/components/motion';
import {
  BalanceHero,
  LockedInMarkets,
  TodaysEarnings,
} from '@/components/wallet';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function WalletHome() {
  const router = useRouter();
  const { walletAvailableKobo, refreshMe } = useAuth();

  const activeQuery = useMyBets({ status: 'active', limit: 50 });
  const wonQuery = useMyBets({ status: 'won', limit: 50 });
  const lostQuery = useMyBets({ status: 'lost', limit: 50 });

  // BACKEND.md §13 — server-side aggregate. Doesn't truncate at the /me/bets
  // pagination limit and carries the denormalized camp.color triplet so
  // LockedInMarkets stops guessing YES/NO from the outcome label.
  const lockedByCamp = useLockedByCamp();

  // Client-derived fallback for older backends or while the locked-by-camp
  // call is still in flight.
  const positions = useMemo(
    () => groupBetsIntoPositions(activeQuery.bets),
    [activeQuery.bets]
  );

  // Today's net P&L (kobo) from settled bets in the last 24h.
  const { deltaKobo, series } = useMemo(() => {
    const cutoff = Date.now() - DAY_MS;
    const settled = [...wonQuery.bets, ...lostQuery.bets]
      .filter((b) => new Date(b.createdAt).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    let cum = 0n;
    const points: number[] = [0];
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
        // Naira granularity — display only.
        points.push(Number(cum / 100n));
      } catch {
        // ignore parse failures
      }
    }
    return { deltaKobo: cum.toString(), series: points };
  }, [wonQuery.bets, lostQuery.bets]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const onRefresh = useCallback(async () => {
    await Promise.allSettled([
      refreshMe(),
      activeQuery.refetch(),
      wonQuery.refetch(),
      lostQuery.refetch(),
      lockedByCamp.refetch(),
    ]);
  }, [refreshMe, activeQuery, wonQuery, lostQuery, lockedByCamp]);

  const isRefreshing =
    activeQuery.isRefetching ||
    wonQuery.isRefetching ||
    lostQuery.isRefetching;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={rs.size(12)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Feather name="chevron-left" size={rs.font(24)} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand}
          />
        }
      >
        <BalanceHero
          availableKobo={walletAvailableKobo}
          label="AVAILABLE"
          hint="Tap an action below to move money."
        />

        <TodaysEarnings deltaKobo={deltaKobo} series={series} />

        <View style={styles.actionsGrid}>
          <ActionTile
            icon="arrow-down-left"
            label="Deposit"
            onPress={() => router.push('/wallet/deposit')}
            primary
          />
          <ActionTile
            icon="arrow-up-right"
            label="Withdraw"
            onPress={() => router.push('/wallet/withdraw')}
          />
          <ActionTile
            icon="pie-chart"
            label="Portfolio"
            onPress={() => router.push('/(tabs)/portfolio')}
          />
          <ActionTile
            icon="list"
            label="History"
            onPress={() => router.push('/wallet/withdraw')}
          />
        </View>

        <LockedInMarkets positions={positions} camps={lockedByCamp.camps} />

        {positions.length === 0 && lockedByCamp.camps.length === 0 ? (
          <Text style={styles.emptyHint}>
            Your stakes go show here. Open a market to lock in.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <PressableSpring
      onPress={onPress}
      variant={primary ? 'primary' : 'secondary'}
      haptic="soft"
      style={styles.actionWrap}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.actionTile,
          primary && styles.actionTilePrimary,
        ]}
      >
        <Feather
          name={icon}
          size={rs.font(18)}
          color={primary ? Colors.text.onAction : Colors.text.primary}
        />
        <Text
          style={[
            styles.actionLabel,
            primary && styles.actionLabelPrimary,
          ]}
        >
          {label}
        </Text>
      </View>
    </PressableSpring>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface['00'] },
  header: {
    paddingHorizontal: rs.size(12),
    paddingTop: rs.size(8),
    paddingBottom: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: rs.size(40),
    height: rs.size(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
  },
  scroll: {
    paddingBottom: rs.size(60),
  },
  actionsGrid: {
    marginTop: rs.size(20),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs.size(10),
  },
  actionWrap: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  actionTile: {
    paddingVertical: rs.size(16),
    paddingHorizontal: rs.size(14),
    borderRadius: rs.size(16),
    backgroundColor: Colors.surface['01'],
    borderWidth: 1,
    borderColor: Colors.border.s01,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
  },
  actionTilePrimary: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  actionLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
  },
  actionLabelPrimary: {
    color: Colors.text.onAction,
  },
  emptyHint: {
    marginTop: rs.size(28),
    paddingHorizontal: rs.size(24),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});
