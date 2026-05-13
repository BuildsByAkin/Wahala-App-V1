// app/(tabs)/portfolio.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useAuth } from '@/features/auth';
import {
  formatKoboAsCompactNaira,
  formatKoboAsNaira,
} from '@/lib/utils/money';
import {
  HistoryRow,
  PositionRow,
  groupBetsIntoPositions,
  sumStakesKobo,
  useMyBets,
} from '@/features/betting';
import { DepositSheet } from '@/features/deposits';
import * as Haptics from 'expo-haptics';

type TabKey = 'open' | 'history';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'history', label: 'History' },
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export default function PortfolioScreen() {
  const { username, displayName, walletAvailableKobo } = useAuth();
  const [active, setActive] = useState<TabKey>('open');
  const [depositOpen, setDepositOpen] = useState(false);

  // Always fetch active bets so the "Positions" stat stays accurate even when
  // the History tab is foregrounded; React Query dedupes between the two hooks.
  const activeQuery = useMyBets({ status: 'active', limit: 50 });
  // History fetches the unfiltered feed and we keep settled rows client-side —
  // the API only accepts one status at a time, so this avoids two round trips.
  const historyQuery = useMyBets({
    enabled: active === 'history',
    limit: 50,
  });

  const positions = useMemo(
    () => groupBetsIntoPositions(activeQuery.bets),
    [activeQuery.bets]
  );

  // History feed = settled bets only, newest first.
  const historyBets = useMemo(() => {
    return [...historyQuery.bets]
      .filter((b) => b.status === 'won' || b.status === 'lost')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [historyQuery.bets]);

  const handle = username || displayName || 'you';
  const initials = useMemo(
    () => initialsFor(displayName || username || 'W'),
    [displayName, username]
  );

  const positionsKobo = useMemo(
    () => sumStakesKobo(activeQuery.bets),
    [activeQuery.bets]
  );

  const totalLabel = formatKoboAsCompactNaira(walletAvailableKobo);
  const cashLabel = formatKoboAsCompactNaira(walletAvailableKobo);
  const positionsLabel = formatKoboAsCompactNaira(positionsKobo);
  const fullBalance = formatKoboAsNaira(walletAvailableKobo);
  const changeLabel = '₦0 (0%)';

  const isRefreshing =
    active === 'open' ? activeQuery.isRefetching : historyQuery.isRefetching;

  const onRefresh = () => {
    activeQuery.refetch();
    if (active === 'history') historyQuery.refetch();
  };

  // The list payload depends on the active tab. We unify into an opaque row
  // type so a single FlashList instance recycles across tab switches.
  type Row =
    | { kind: 'position'; data: ReturnType<typeof groupBetsIntoPositions>[number] }
    | { kind: 'history'; data: ReturnType<typeof useMyBets>['bets'][number] };

  const rows: Row[] = useMemo(() => {
    if (active === 'open') {
      return positions.map((p) => ({ kind: 'position' as const, data: p }));
    }
    return historyBets.map((b) => ({ kind: 'history' as const, data: b }));
  }, [active, positions, historyBets]);

  const renderRow = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'position') return <PositionRow position={item.data} />;
    return <HistoryRow bet={item.data} />;
  }, []);

  const paneState =
    active === 'open'
      ? {
          isLoading: activeQuery.isLoading,
          isError: activeQuery.isError,
          onRetry: activeQuery.refetch,
        }
      : {
          isLoading: historyQuery.isLoading,
          isError: historyQuery.isError,
          onRetry: historyQuery.refetch,
        };

  const ListHeader = (
    <View>
      {/* Identity row */}
      <View style={styles.identityRow}>
          <View style={styles.identityLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.handleText} numberOfLines={1}>
              {handle}
            </Text>
          </View>
        </View>

        {/* Title + balance + deposit */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.titleText}>Portfolio</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.nairaSymbol}>₦</Text>
              <Text
                style={styles.balanceText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {totalLabel}
              </Text>
            </View>
            <Text style={styles.changeText}>{changeLabel}</Text>
          </View>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDepositOpen(true);
            }}
            style={({ pressed }) => [
              styles.depositButton,
              pressed && styles.depositButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Deposit funds"
            accessibilityHint="Opens the top-up sheet"
          >
            <Feather name="plus" size={rs.font(16)} color="#0A0A0A" />
            <Text style={styles.depositText}>Deposit</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Stat label="Positions" value={`₦${positionsLabel}`} />
          <Stat label="Cash" value={`₦${cashLabel}`} accent />
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {TABS.map((t) => {
            const isActive = active === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActive(t.key)}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t.label}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {t.label.toUpperCase()}
                </Text>
                {isActive && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>

      <View style={styles.divider} />

      {paneState.isLoading ? <ListSkeleton /> : null}
    </View>
  );

  const ListEmpty = !paneState.isLoading
    ? paneState.isError
      ? <ErrorState onRetry={paneState.onRetry} />
      : active === 'open'
        ? (
          <EmptyState
            icon="trending-up"
            title="No open positions"
            hint={`Wetin you bet on go show here. Wallet balance: ₦${fullBalance}`}
          />
        )
        : (
          <EmptyState
            icon="clock"
            title="No settled bets"
            hint="Once your markets resolve, the wins and losses go land here."
          />
        )
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
            tintColor="#FF6500"
          />
        }
      />

      <DepositSheet
        visible={depositOpen}
        onClose={() => setDepositOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

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
        <Feather name="alert-circle" size={rs.font(22)} color="#FF8A8A" />
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
        <Feather name={icon} size={rs.font(22)} color="#888888" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint} numberOfLines={2}>
        {hint}
      </Text>
    </View>
  );
}

function Stat({
  label,
  value,
  accent,
  underline,
  info,
}: {
  label: string;
  value: string;
  accent?: boolean;
  underline?: boolean;
  info?: boolean;
}) {
  return (
    <View style={styles.statCol}>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
        {accent && <View style={styles.statDot} />}
        {info && (
          <Feather
            name="info"
            size={rs.font(12)}
            color="#FF6500"
            style={styles.statInfoIcon}
          />
        )}
      </View>
      <Text
        style={[styles.statValue, underline && styles.statValueUnderline]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  contentContainer: {
    paddingBottom: rs.size(120),
  },
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
    backgroundColor: '#FF6500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
  },
  handleText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(16),
    color: '#FFFFFF',
    flexShrink: 1,
  },
  headerRow: {
    marginTop: rs.size(20),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rs.size(12),
  },
  headerLeft: {
    flexShrink: 1,
  },
  titleText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceRow: {
    marginTop: rs.size(4),
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  nairaSymbol: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#FFFFFF',
    marginRight: rs.size(2),
  },
  balanceText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(32),
    color: '#FFFFFF',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  changeText: {
    marginTop: rs.size(2),
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    color: '#888888',
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    backgroundColor: '#FF6500',
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(9999),
    marginTop: rs.size(4),
  },
  depositButtonPressed: {
    opacity: 0.85,
  },
  depositText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: '#0A0A0A',
  },
  statsRow: {
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    gap: rs.size(40),
  },
  statCol: {
    minWidth: rs.size(72),
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888888',
  },
  statDot: {
    width: rs.size(10),
    height: rs.size(10),
    borderRadius: rs.size(5),
    borderWidth: rs.size(2),
    borderColor: '#FF6500',
    backgroundColor: 'transparent',
  },
  statInfoIcon: {
    marginLeft: rs.size(2),
  },
  statValue: {
    marginTop: rs.size(4),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#FFFFFF',
  },
  statValueUnderline: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#444444',
  },
  tabsRow: {
    marginTop: rs.size(28),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(20),
  },
  tabItem: {
    paddingVertical: rs.size(8),
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    letterSpacing: 1,
    color: '#555555',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabUnderline: {
    marginTop: rs.size(6),
    height: rs.size(2),
    width: '100%',
    backgroundColor: '#FF6500',
    borderRadius: rs.size(1),
  },
  divider: {
    marginTop: rs.size(0),
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1F1F1F',
    marginHorizontal: rs.size(20),
  },
  emptyState: {
    marginTop: rs.size(72),
    alignItems: 'center',
    paddingHorizontal: rs.size(32),
  },
  emptyIconCircle: {
    width: rs.size(48),
    height: rs.size(48),
    borderRadius: rs.size(24),
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: rs.size(16),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(16),
    color: '#888888',
  },
  emptyHint: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#555555',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: rs.size(16),
    paddingHorizontal: rs.size(20),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(9999),
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  retryText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  skeletonRow: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(12),
    height: rs.size(120),
    backgroundColor: '#0F0F0F',
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: '#161616',
  },
});
