// app/(tabs)/index.tsx
// Home screen — Bundle 1 composition (REDESIGN.md §4 + REDESIGN_v2.md §4.1).
//   Persistent HeaderBar (logo + StreakFlame + balance + bell).
//   TodaysWahalaBand (v2 daily band with countdown + camp doors).
//   HeroPulseCard (first featured market — 250dp showpiece).
//   Sticky CategoryFilter with ChipToggle motion.
//   FlashList feed with CardEnter stagger (FadeInUp(220).delay(index * 30)).
//   Pidgin funding banner + Pidgin empty state.
//   WahalaSpinner pull-to-refresh.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { CategoryFilter } from '@/components/home/CategoryFilter';
import { HeaderBar } from '@/components/home/HeaderBar';
import { HeroPulseCard } from '@/components/home/HeroPulseCard';
import { MarketCardCompact } from '@/components/home/MarketCardCompact';
import { MarketCardFull } from '@/components/home/MarketCardFull';
import { TodaysWahalaBand } from '@/components/home/TodaysWahalaBand';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { SkeletonShimmer } from '@/components/motion/SkeletonShimmer';
import { WahalaSpinner } from '@/components/motion/WahalaSpinner';
import { useAuth } from '@/features/auth';
import { useMyBets } from '@/features/betting';
import { useDailyWahala } from '@/features/daily-wahala';
import { useMarkets } from '@/hooks/useMarkets';
import { useStreak } from '@/hooks/useStreak';
import { deriveMarketStateVariant } from '@/utils/marketStateVariant';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { withdrawalKeys } from '@/lib/api/query-keys';
import { type Market, shouldRenderFullCard, uniqueCategories } from '@/utils/market';

// Wait for `/me` to settle before deciding the wallet is truly empty so the
// banner doesn't flash on cold start.
const FUNDING_BANNER_DELAY_MS = 30_000;

const MarketSeparator = () => <View style={styles.cardSeparator} />;

function SkeletonFeed() {
  return (
    <View style={styles.feed}>
      <SkeletonShimmer height={rs.size(180)} borderRadius={rs.size(18)} />
      <SkeletonShimmer height={rs.size(140)} borderRadius={rs.size(18)} />
      <SkeletonShimmer height={rs.size(140)} borderRadius={rs.size(18)} />
    </View>
  );
}

interface FeedItem {
  market: Market;
  index: number;
  /** When true skip the entering animation (subsequent scrolls). */
  skipEnter: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState('All');
  const { walletAvailableKobo, refreshMe } = useAuth();
  const streak = useStreak();

  const hasBalance = useMemo(() => {
    if (!walletAvailableKobo) return false;
    try {
      return BigInt(walletAvailableKobo) > 0n;
    } catch {
      return false;
    }
  }, [walletAvailableKobo]);

  // Funding-banner gating.
  const [fundingBannerReady, setFundingBannerReady] = useState(false);
  const [dismissedFundingBanner, setDismissedFundingBanner] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFundingBannerReady(true), FUNDING_BANNER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const showFundingBanner =
    fundingBannerReady && !dismissedFundingBanner && walletAvailableKobo === '0';

  const { markets, isLoading, isError, refetch, isRefetching } = useMarkets();
  const { bets: myBets } = useMyBets();

  const openMarkets = useMemo(
    () => markets.filter((m) => m.status === 'open'),
    [markets]
  );

  // First-featured market is the Hero. Today's Wahala uses the same market
  // as a stand-in until a curated daily endpoint lands.
  const heroMarket = useMemo(
    () => openMarkets.find((m) => m.featured) ?? openMarkets[0] ?? null,
    [openMarkets]
  );

  // BACKEND.md §4 — server-curated daily. Falls back to the most-recent
  // featured market when /daily-wahala 404s (cold launch, no daily set).
  const { data: dailyWahala } = useDailyWahala();

  const todaysWahalaMarket = useMemo(() => {
    if (dailyWahala?.market) return dailyWahala.market;
    const featured = markets.filter((m) => m.featured);
    if (featured.length === 0) return heroMarket;
    // Prefer open → resolved (post-verdict) → newest closesAt.
    const sorted = [...featured].sort((a, b) => {
      const rank = (s: Market['status']) =>
        s === 'open' ? 0 : s === 'resolved' ? 1 : s === 'locked' ? 2 : 3;
      const rdiff = rank(a.status) - rank(b.status);
      if (rdiff !== 0) return rdiff;
      return new Date(b.closesAt).getTime() - new Date(a.closesAt).getTime();
    });
    return sorted[0] ?? heroMarket;
  }, [dailyWahala?.market, markets, heroMarket]);

  const categories = useMemo(
    () => (openMarkets.length > 0 ? uniqueCategories(openMarkets) : []),
    [openMarkets]
  );

  const visibleMarkets = useMemo(() => {
    // Hero is rendered once at the top; exclude it from the rest of the feed
    // to avoid duplicating it.
    const base = activeCategory === 'All'
      ? openMarkets
      : openMarkets.filter((m) => m.category === activeCategory);
    if (!heroMarket) return base;
    return base.filter((m) => m.id !== heroMarket.id);
  }, [openMarkets, activeCategory, heroMarket]);

  // Mark whether the first paint has happened. After that, FlashList items
  // entering the viewport via scroll should not stagger — they should appear
  // *as scrolled to*, not delayed.
  const mountedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      mountedRef.current = true;
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // Silent refresh of profile + wallet + withdrawal history whenever the app
  // returns to the foreground.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        void refreshMe();
        queryClient.invalidateQueries({ queryKey: withdrawalKeys.list() });
      }
    });
    return () => subscription.remove();
  }, [refreshMe, queryClient]);

  useEffect(() => {
    if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categories, activeCategory]);

  const feedData: FeedItem[] = useMemo(
    () =>
      visibleMarkets.map((m, i) => ({
        market: m,
        index: i,
        skipEnter: mountedRef.current,
      })),
    [visibleMarkets]
  );

  const goToMarket = useCallback(
    (slug: string) => router.push(`/market/${slug}` as never),
    [router]
  );

  const renderMarket: ListRenderItem<FeedItem> = useCallback(
    ({ item }) => {
      const ctaVariant: 'stake' | 'view' =
        hasBalance && item.market.status === 'open' ? 'stake' : 'view';
      const isFull = shouldRenderFullCard(item.market);
      const enter =
        item.skipEnter || reduced
          ? undefined
          : FadeInUp.duration(220).delay(Math.min(item.index, 6) * 30);
      const variant = deriveMarketStateVariant(item.market, { myBets });
      const Card = isFull ? (
        <MarketCardFull
          market={item.market}
          ctaVariant={ctaVariant}
          stateVariant={variant}
          onPressLeader={() => goToMarket(item.market.slug)}
          onPressTrailer={() => goToMarket(item.market.slug)}
        />
      ) : (
        <MarketCardCompact
          market={item.market}
          ctaVariant={ctaVariant}
          stateVariant={variant}
          onPressStake={() => goToMarket(item.market.slug)}
        />
      );
      return (
        <Animated.View style={styles.cardWrapper} entering={enter}>
          <PressableSpring
            variant="ghost"
            haptic="tap"
            onPress={() => goToMarket(item.market.slug)}
            accessibilityRole="button"
            accessibilityLabel={`Open market: ${item.market.question}`}
          >
            {Card}
          </PressableSpring>
        </Animated.View>
      );
    },
    [goToMarket, hasBalance, reduced, myBets]
  );

  const ListHeader = (
    <View>
      <HeaderBar
        walletAvailableKobo={walletAvailableKobo}
        streakCount={streak.count}
        notificationCount={0}
      />

      {todaysWahalaMarket ? <TodaysWahalaBand market={todaysWahalaMarket} /> : null}

      {heroMarket ? (
        <Animated.View
          style={styles.heroWrap}
          entering={reduced ? undefined : FadeInUp.duration(260)}
        >
          <HeroPulseCard market={heroMarket} />
        </Animated.View>
      ) : null}

      {showFundingBanner ? (
        <PressableSpring
          variant="ghost"
          haptic="soft"
          onPress={() => router.push('/wallet/deposit' as never)}
          style={styles.fundingBanner}
          accessibilityRole="button"
          accessibilityLabel="Fund your wallet to start staking"
          accessibilityHint="Opens the deposit screen"
        >
          <View style={styles.fundingIcon}>
            <Feather name="zap" size={rs.size(20)} color="#000000" />
          </View>
          <View style={styles.fundingCopy}>
            <Text style={styles.fundingTitle}>Your wallet still dey empty.</Text>
            <Text style={styles.fundingBody}>
              Drop ₦1k make the gist begin.
            </Text>
          </View>
          <Feather name="chevron-right" size={rs.size(18)} color={Colors.brand} />
          <PressableSpring
            variant="ghost"
            haptic="tap"
            onPress={() => setDismissedFundingBanner(true)}
            hitSlop={12}
            style={styles.fundingDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss funding banner"
          >
            <Feather name="x" size={rs.size(18)} color={Colors.text.tertiary} />
          </PressableSpring>
        </PressableSpring>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Hot gist 🔥</Text>
        {visibleMarkets.length > 0 ? (
          <Text style={styles.sectionCount}>{visibleMarkets.length}</Text>
        ) : null}
      </View>

      {categories.length > 0 && (
        <View style={styles.filterWrapper}>
          <CategoryFilter
            categories={categories}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
        </View>
      )}

      {isLoading ? <SkeletonFeed /> : <View style={styles.feedTopSpacer} />}
    </View>
  );

  const ListEmpty = !isLoading ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {isError ? "E no work — pull down make we try again." : 'E quiet for this category…'}
      </Text>
      <Text style={styles.emptyBody}>
        {isError
          ? 'Network just dey play. Try refresh.'
          : 'Try another category, abeg.'}
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlashList
        data={isLoading ? [] : feedData}
        renderItem={renderMarket}
        keyExtractor={(item) => item.market.id}
        getItemType={(item) => (shouldRenderFullCard(item.market) ? 'full' : 'compact')}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ItemSeparatorComponent={MarketSeparator}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={Colors.brand}
            colors={[Colors.brand]}
          />
        }
      />
      {isRefetching ? (
        <View style={styles.spinnerOverlay} pointerEvents="none">
          <WahalaSpinner refreshing />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface['00'],
  },
  contentContainer: {
    paddingBottom: rs.size(100),
  },
  heroWrap: {
    marginTop: rs.size(8),
  },
  sectionHeader: {
    marginTop: rs.size(20),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    color: Colors.text.tertiary,
    fontVariant: ['tabular-nums'],
  },
  filterWrapper: {
    marginTop: rs.size(10),
  },
  feed: {
    marginTop: rs.size(12),
    paddingHorizontal: rs.size(16),
    gap: rs.size(12),
  },
  cardWrapper: {
    paddingHorizontal: rs.size(16),
  },
  cardSeparator: {
    height: rs.size(12),
  },
  feedTopSpacer: {
    height: rs.size(12),
  },
  emptyState: {
    marginTop: rs.size(36),
    paddingHorizontal: rs.size(24),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  fundingBanner: {
    marginHorizontal: rs.size(16),
    marginTop: rs.size(14),
    backgroundColor: Colors.surface['02'],
    borderRadius: rs.size(16),
    padding: rs.size(14),
    paddingRight: rs.size(40),
    borderWidth: 1,
    borderColor: `${Colors.brand}33`,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fundingIcon: {
    width: rs.size(40),
    height: rs.size(40),
    borderRadius: rs.size(20),
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundingCopy: {
    flex: 1,
    marginLeft: rs.size(12),
  },
  fundingTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
    includeFontPadding: false,
  },
  fundingBody: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
    includeFontPadding: false,
  },
  fundingDismiss: {
    position: 'absolute',
    top: rs.size(6),
    right: rs.size(6),
    width: rs.size(28),
    height: rs.size(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerOverlay: {
    position: 'absolute',
    top: rs.size(80),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
