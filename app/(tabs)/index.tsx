// app/(tabs)/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { CategoryFilter } from '@/components/home/CategoryFilter';
import { MarketCardFull } from '@/components/home/MarketCardFull';
import { MarketCardCompact } from '@/components/home/MarketCardCompact';
import { useAuth } from '@/features/auth';
import { useMarkets } from '@/hooks/useMarkets';
import { type Market, shouldRenderFullCard, uniqueCategories } from '@/utils/market';

const SKELETON_HEIGHTS = [160, 120, 120];

// Vertical breathing room between cards. Hoisted so React doesn't re-create
// the component on every parent render (which would defeat FlashList's
// separator memoisation).
const MarketSeparator = () => <View style={styles.cardSeparator} />;

function SkeletonFeed() {
  // Reanimated v3 — drives opacity on the UI thread so a long FlashList re-render
  // doesn't pause the skeleton pulse.
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.feed}>
      {SKELETON_HEIGHTS.map((h, i) => (
        <Animated.View
          key={i}
          style={[styles.skeleton, { height: rs.size(h) }, pulseStyle]}
        />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const { displayName, username, refreshMe } = useAuth();
  const greetingName = displayName?.trim() || username || 'friend';

  const { markets, isLoading, isError, refetch, isRefetching } = useMarkets();

  // Backend already returns only effectively-open markets (drafts removed,
  // scheduled-but-past-opensAt rolled into open). This filter is a defensive
  // belt-and-braces — accept anything the API hands us as effective `open`.
  const openMarkets = useMemo(
    () => markets.filter((m) => m.status === 'open'),
    [markets]
  );

  const categories = useMemo(
    () => (openMarkets.length > 0 ? uniqueCategories(openMarkets) : []),
    [openMarkets]
  );

  const visibleMarkets = useMemo(() => {
    if (activeCategory === 'All') return openMarkets;
    return openMarkets.filter((m) => m.category === activeCategory);
  }, [openMarkets, activeCategory]);

  // Silent refresh of profile + wallet whenever the app returns to the
  // foreground. Fire-and-forget — never block the UI on it.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active'
      ) {
        void refreshMe();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [refreshMe]);

  // Reset filter if its category disappears from the dataset.
  useEffect(() => {
    if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categories, activeCategory]);

  // FlashList performs best when item dimensions are roughly known and the
  // renderer function is stable. We use the `Market.id` as the stable key and
  // expose `shouldRenderFullCard` as a discriminator so FlashList can recycle
  // separately within each visual type.
  const renderMarket: ListRenderItem<Market> = useCallback(
    ({ item }) => (
      <Pressable
        style={({ pressed }) => [styles.cardWrapper, pressed && styles.cardPressed]}
        onPress={() => router.push(`/market/${item.slug}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`Open market: ${item.question}`}
      >
        {shouldRenderFullCard(item) ? (
          <MarketCardFull market={item} />
        ) : (
          <MarketCardCompact market={item} />
        )}
      </Pressable>
    ),
    [router]
  );

  const ListHeader = (
    <View>
      <View style={styles.topBar}>
        <Text style={styles.logo}>Wahala</Text>
        <View style={styles.topIcons}>
          <Pressable style={styles.iconButton}>
            <Feather name="bell" size={rs.font(22)} color="#FFFFFF" />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>
      </View>

      <View style={styles.greetingRow}>
        <Text style={styles.greetingText} numberOfLines={1}>
          <Text style={styles.greetingRegular}>Wetin dey shake, </Text>
          <Text style={styles.greetingBold}>{greetingName}</Text>
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Hot gist</Text>
          <Text style={styles.fireEmoji}> 🔥</Text>
        </View>
        <Pressable style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>
            See all {visibleMarkets.length > 0 ? `(${visibleMarkets.length}) ` : ''}
          </Text>
          <Text style={styles.seeAllChevron}>›</Text>
        </Pressable>
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
      <Text style={styles.emptyText}>
        {isError
          ? "Couldn't load markets, pull down to retry"
          : 'No markets right now, check back soon'}
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <FlashList
        data={isLoading ? [] : visibleMarkets}
        renderItem={renderMarket}
        keyExtractor={(m) => m.id}
        getItemType={(m) => (shouldRenderFullCard(m) ? 'full' : 'compact')}
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
            tintColor="#FF6500"
            colors={['#FF6500']}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  contentContainer: {
    paddingBottom: rs.size(100),
  },
  topBar: {
    height: rs.size(56),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: rs.font(26),
    color: '#FF6500',
  },
  topIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  iconButton: {
    width: rs.size(32),
    height: rs.size(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: rs.size(4),
    right: rs.size(4),
    width: rs.size(7),
    height: rs.size(7),
    borderRadius: rs.size(3.5),
    backgroundColor: '#FF3B30',
  },
  greetingRow: {
    marginTop: rs.size(4),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontSize: rs.font(15),
  },
  greetingRegular: {
    fontFamily: Fonts.regular,
    color: '#AAAAAA',
  },
  greetingBold: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
  },
  fireEmoji: {
    fontSize: rs.font(18),
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#555555',
  },
  seeAllChevron: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(16),
    color: '#555555',
    marginTop: rs.size(-2),
  },
  filterWrapper: {
    marginTop: rs.size(12),
  },
  feed: {
    marginTop: rs.size(16),
    paddingHorizontal: rs.size(16),
    gap: rs.size(12),
  },
  // FlashList recycles items individually, so the old parent `gap` no longer
  // applies. Each card carries its own horizontal inset and the separator
  // below adds the vertical breathing room.
  cardWrapper: {
    paddingHorizontal: rs.size(16),
  },
  cardSeparator: {
    height: rs.size(12),
  },
  feedTopSpacer: {
    height: rs.size(16),
  },
  cardPressed: {
    opacity: 0.85,
  },
  skeleton: {
    backgroundColor: '#1A1A1A',
    borderRadius: rs.size(16),
  },
  emptyState: {
    marginTop: rs.size(48),
    paddingHorizontal: rs.size(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#888888',
    textAlign: 'center',
  },
});
