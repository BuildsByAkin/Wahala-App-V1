// app/(tabs)/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { CATEGORIES, MARKETS } from '@/data/placeholder';
import { LiveTicker } from '@/components/home/LiveTicker';
import { CategoryFilter } from '@/components/home/CategoryFilter';
import { MarketCardFull } from '@/components/home/MarketCardFull';
import { MarketCardCompact } from '@/components/home/MarketCardCompact';
import { useAuth } from '@/features/auth';
import { formatKoboAsNaira } from '@/lib/utils/money';

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const { displayName, username, walletAvailableKobo, refreshMe } = useAuth();
  const greetingName = displayName?.trim() || username || 'friend';
  const balanceText = formatKoboAsNaira(walletAvailableKobo);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.logo}>Wahala</Text>
          <View style={styles.topIcons}>
            <Pressable style={styles.iconButton}>
              <Feather name="search" size={rs.font(22)} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Feather name="bell" size={rs.font(22)} color="#FFFFFF" />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        {/* Greeting + Balance Row */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText} numberOfLines={1}>
            <Text style={styles.greetingRegular}>Wetin dey shake, </Text>
            <Text style={styles.greetingBold}>{greetingName}</Text>
          </Text>
          <Pressable style={styles.balancePill}>
            <Text style={styles.nairaSymbol}>₦</Text>
            <Text style={styles.balanceAmount}>{balanceText}</Text>
            <Feather name="chevron-right" size={rs.font(14)} color="#555555" />
          </Pressable>
        </View>

        {/* Live Ticker */}
        <View style={styles.tickerWrapper}>
          <LiveTicker />
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Hot gist</Text>
            <Text style={styles.fireEmoji}> 🔥</Text>
          </View>
          <Pressable style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See all </Text>
            <Text style={styles.seeAllChevron}>›</Text>
          </Pressable>
        </View>

        {/* Category Filter */}
        <View style={styles.filterWrapper}>
          <CategoryFilter
            categories={CATEGORIES}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
        </View>

        {/* Feed */}
        <View style={styles.feed}>
          {MARKETS.map((market) => (
            <View key={market.id} style={styles.cardWrapper}>
              {market.type === 'full' ? (
                <MarketCardFull market={market} />
              ) : (
                <MarketCardCompact market={market} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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
  balancePill: {
    backgroundColor: '#1A1A1A',
    borderRadius: rs.size(20),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  nairaSymbol: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FF6500',
  },
  balanceAmount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  tickerWrapper: {
    marginTop: rs.size(14),
    marginHorizontal: rs.size(20),
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
  cardWrapper: {
    // Gap handled by parent View gap style
  },
});
