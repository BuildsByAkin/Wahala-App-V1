// app/(tabs)/leaderboard.tsx
//
// Top Winners. Premium leaderboard layout inspired by Duolingo Leagues +
// Strava segments + competitive sports scoreboards:
//   - Hero podium for ranks 1–3 (asymmetric pedestals, crown on #1)
//   - Clean ranked list for ranks 4+
//   - Sticky bottom card pinning the current user's standing (or an opt-in
//     CTA when they've hidden themselves from the board)
//
// Numbers and spacing all flow through `rs` so layout stays identical from
// iPhone SE to iPad mini. No new dependencies: depth comes from layered
// Views, soft shadows, and Reanimated for the winner glow pulse.
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useAuth } from '@/features/auth';
import { useLeaderboard, type LeaderboardEntry } from '@/features/leaderboard';
import { formatKoboAsCompactNaira } from '@/lib/utils/money';
import { getInitial } from '@/utils/market';
import { PressableSpring } from '@/components/motion';
import { time } from '@/lib/motion/timings';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const BRAND = '#FF6500';
const GOLD = '#FFC83D';
const SILVER = '#D1D5DB';
const BRONZE = '#CD7F32';
const SURFACE = '#111111';
const SURFACE_2 = '#161616';
const HAIRLINE = '#1F1F1F';

// ── Screen ─────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const router = useRouter();
  const { userId, leaderboardOptIn } = useAuth();
  const {
    entries,
    isLoading,
    isError,
    refetch,
    isRefetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useLeaderboard();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Trigger the next page when the user scrolls within ~600dp of the bottom.
  // Cheap, no extra deps; FlashList isn't ergonomic here because the podium
  // header is half the screen.
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasNextPage || isFetchingNextPage) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromEnd =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromEnd < rs.size(600)) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const podium = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);
  const myEntry = useMemo(
    () => entries.find((e) => e.userId === userId) ?? null,
    [entries, userId]
  );

  const goToProfile = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/(tabs)/profile');
  }, [router]);

  // The "you're hidden" CTA used to sit pinned at the bottom of the screen;
  // we now render it as a top banner so it's visible the moment the page
  // opens, regardless of how far the user scrolls. The bottom area is
  // reserved for the YouFooter (your live rank) when the user is on-board.
  const topNotice =
    !myEntry && !leaderboardOptIn ? (
      <OptInBanner onPress={goToProfile} />
    ) : null;

  // ── Render branches ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header count={null} />
        {topNotice}
        <View style={styles.center}>
          <ActivityIndicator color={BRAND} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header count={null} />
        {topNotice}
        <ErrorState onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header count={0} />
        {topNotice}
        <EmptyState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Header count={entries.length} />
      {topNotice}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={64}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={BRAND}
          />
        }
      >
        {podium.length >= 1 ? (
          <Podium entries={podium} myUserId={userId} />
        ) : null}

        {rest.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel}>RANKINGS</Text>
            <View style={styles.listCard}>
              {rest.map((entry, idx) => (
                <RankRow
                  key={entry.userId}
                  entry={entry}
                  isMe={entry.userId === userId}
                  isLast={idx === rest.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        <FollowComingSoonNote />

        {isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : !hasNextPage && entries.length > 3 ? (
          <Text style={styles.endOfList}>You&apos;ve reached the end</Text>
        ) : null}
      </ScrollView>

      {/* Sticky personal footer — only your rank when you're on the board.
          The opt-in CTA is pinned to the top of the screen (see topNotice). */}
      {myEntry ? <YouFooter entry={myEntry} /> : null}
    </SafeAreaView>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────

function Header({ count }: { count: number | null }) {
  const meta =
    count === null
      ? 'ALL-TIME'
      : count === 0
        ? 'ALL-TIME · NO ENTRIES YET'
        : `ALL-TIME · ${count} ${count === 1 ? 'PLAYER' : 'PLAYERS'}`;
  return (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <Text style={styles.headerTitle}>Top Winners</Text>
        <View style={styles.headerBadge}>
          <Feather name="award" size={rs.font(13)} color={BRAND} />
          <Text style={styles.headerBadgeText}>Live</Text>
        </View>
      </View>
      <Text style={styles.headerMeta}>{meta}</Text>
    </View>
  );
}

// ── Podium (top 3) ─────────────────────────────────────────────────────────

function Podium({
  entries,
  myUserId,
}: {
  entries: LeaderboardEntry[];
  myUserId: string | null;
}) {
  const e1 = entries[0];
  const e2 = entries[1];
  const e3 = entries[2];

  return (
    <View style={styles.podiumWrap}>
      <View style={styles.podiumRow}>
        {/* Order: 2 — 1 — 3 (visually mirrors a real podium) */}
        <View style={styles.podiumCol}>
          {e2 ? (
            <PodiumCard
              entry={e2}
              rank={2}
              tone={SILVER}
              size="side"
              isMe={e2.userId === myUserId}
            />
          ) : (
            <PodiumPlaceholder rank={2} tone={SILVER} size="side" />
          )}
          <Pedestal height={rs.size(56)} tone={SILVER} rank={2} />
        </View>

        <View style={styles.podiumCol}>
          {e1 ? (
            <PodiumCard
              entry={e1}
              rank={1}
              tone={GOLD}
              size="winner"
              isMe={e1.userId === myUserId}
            />
          ) : (
            <PodiumPlaceholder rank={1} tone={GOLD} size="winner" />
          )}
          <Pedestal height={rs.size(80)} tone={GOLD} rank={1} />
        </View>

        <View style={styles.podiumCol}>
          {e3 ? (
            <PodiumCard
              entry={e3}
              rank={3}
              tone={BRONZE}
              size="side"
              isMe={e3.userId === myUserId}
            />
          ) : (
            <PodiumPlaceholder rank={3} tone={BRONZE} size="side" />
          )}
          <Pedestal height={rs.size(40)} tone={BRONZE} rank={3} />
        </View>
      </View>
    </View>
  );
}

function PodiumCard({
  entry,
  rank,
  tone,
  size,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  tone: string;
  size: 'winner' | 'side';
  isMe: boolean;
}) {
  const initial = getInitial(entry.displayName, entry.username);
  const name = entry.displayName?.trim() || entry.username;
  const isWinner = size === 'winner';
  const avatarSize = isWinner ? rs.size(76) : rs.size(60);

  // Slow, gentle pulse halo around the winner — communicates "live" and
  // hierarchy without being noisy. Side cards stay still. Driven by the
  // `time.slow` easing preset (extended to 1800ms for the breathing rhythm).
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!isWinner || reduced) return;
    pulse.value = withRepeat(
      withTiming(1, { ...time.slow, duration: 1800 }),
      -1,
      true
    );
  }, [isWinner, reduced, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  return (
    <View style={styles.podiumCardWrap}>
      {isWinner ? (
        <View style={styles.crownWrap}>
          <Feather name="award" size={rs.font(18)} color={GOLD} />
        </View>
      ) : null}

      <View style={[styles.avatarStack, { height: avatarSize + rs.size(12) }]}>
        {isWinner ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.winnerHalo,
              {
                width: avatarSize + rs.size(20),
                height: avatarSize + rs.size(20),
                borderRadius: (avatarSize + rs.size(20)) / 2,
              },
              haloStyle,
            ]}
          />
        ) : null}
        <View
          style={[
            styles.podiumAvatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: tone,
              borderWidth: isWinner ? rs.size(3) : rs.size(2),
            },
          ]}
        >
          <Text
            style={[
              styles.podiumAvatarText,
              { fontSize: isWinner ? rs.font(26) : rs.font(20) },
            ]}
          >
            {initial}
          </Text>
        </View>
        <View
          style={[
            styles.rankChip,
            { backgroundColor: tone },
          ]}
        >
          <Text style={styles.rankChipText}>{rank}</Text>
        </View>
      </View>

      <Text
        style={[
          styles.podiumName,
          isWinner && styles.podiumNameWinner,
          isMe && styles.podiumNameMe,
        ]}
        numberOfLines={1}
      >
        {name}
        {isMe ? ' · You' : ''}
      </Text>
      <Text style={styles.podiumWins} numberOfLines={1}>
        {entry.winsCount} {entry.winsCount === 1 ? 'win' : 'wins'}
      </Text>
      <ProfitText profitKobo={entry.netProfitKobo} emphasis={isWinner} />
    </View>
  );
}

function PodiumPlaceholder({
  rank,
  tone,
  size,
}: {
  rank: 1 | 2 | 3;
  tone: string;
  size: 'winner' | 'side';
}) {
  const isWinner = size === 'winner';
  const avatarSize = isWinner ? rs.size(76) : rs.size(60);
  return (
    <View style={styles.podiumCardWrap}>
      <View style={[styles.avatarStack, { height: avatarSize + rs.size(12) }]}>
        <View
          style={[
            styles.podiumAvatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: HAIRLINE,
              backgroundColor: SURFACE_2,
              borderWidth: rs.size(2),
            },
          ]}
        >
          <Feather name="user" size={rs.font(20)} color="#3A3A3A" />
        </View>
        <View
          style={[
            styles.rankChip,
            { backgroundColor: tone, opacity: 0.55 },
          ]}
        >
          <Text style={styles.rankChipText}>{rank}</Text>
        </View>
      </View>
      <Text style={styles.podiumNamePlaceholder}>—</Text>
      <Text style={styles.podiumWins}>Open spot</Text>
    </View>
  );
}

function Pedestal({
  height,
  tone,
  rank,
}: {
  height: number;
  tone: string;
  rank: 1 | 2 | 3;
}) {
  return (
    <View
      style={[
        styles.pedestal,
        {
          height,
          backgroundColor: SURFACE,
          borderTopColor: tone,
        },
      ]}
    >
      <Text style={styles.pedestalRank}>{rank}</Text>
    </View>
  );
}

// ── Rank rows (4+) ─────────────────────────────────────────────────────────

function RankRow({
  entry,
  isMe,
  isLast,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  isLast: boolean;
}) {
  const initial = getInitial(entry.displayName, entry.username);
  const name = entry.displayName?.trim() || entry.username;

  return (
    <PressableSpring
      haptic="tap"
      accessibilityLabel={`Rank ${entry.rank}, ${name}`}
      accessibilityHint="Highlights this competitor"
    >
      <View
        style={[
          styles.rankRow,
          !isLast && styles.rankRowDivider,
          isMe && styles.rankRowMe,
        ]}
      >
        <Text style={styles.rankRowNum}>{entry.rank}</Text>

        <View style={styles.rankRowAvatar}>
          <Text style={styles.rankRowAvatarText}>{initial}</Text>
        </View>

        <View style={styles.rankRowMid}>
          <Text style={styles.rankRowName} numberOfLines={1}>
            {name}
            {isMe ? <Text style={styles.youTag}>  · You</Text> : null}
          </Text>
          <Text style={styles.rankRowSub} numberOfLines={1}>
            @{entry.username} · {entry.winsCount} {entry.winsCount === 1 ? 'win' : 'wins'}
          </Text>
        </View>

        <View style={styles.rankRowRight}>
          <ProfitText profitKobo={entry.netProfitKobo} emphasis={false} />
        </View>
      </View>
    </PressableSpring>
  );
}

// ── Profit text ────────────────────────────────────────────────────────────

function ProfitText({
  profitKobo,
  emphasis,
}: {
  profitKobo: string;
  emphasis: boolean;
}) {
  const negative = profitKobo.startsWith('-');
  return (
    <Text
      style={[
        styles.profitText,
        emphasis && styles.profitTextEmphasis,
        negative ? styles.profitNeg : styles.profitPos,
      ]}
      numberOfLines={1}
    >
      {negative ? '' : '+'}₦{formatKoboAsCompactNaira(profitKobo)}
    </Text>
  );
}

// ── Sticky footers ────────────────────────────────────────────────────────

function YouFooter({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View style={styles.footerWrap} pointerEvents="box-none">
      <View style={styles.youCard}>
        <View style={styles.youRankBadge}>
          <Text style={styles.youRankBadgeText}>#{entry.rank}</Text>
        </View>
        <View style={styles.youCardMid}>
          <Text style={styles.youCardLabel}>YOUR RANK</Text>
          <Text style={styles.youCardName} numberOfLines={1}>
            {entry.winsCount} {entry.winsCount === 1 ? 'win' : 'wins'} · ₦
            {formatKoboAsCompactNaira(entry.totalWinningsKobo)} won
          </Text>
        </View>
        <ProfitText profitKobo={entry.netProfitKobo} emphasis />
      </View>
    </View>
  );
}

function OptInBanner({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.topNoticeWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Go to profile to opt in to the leaderboard"
        style={({ pressed }) => [
          styles.optInCard,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.optInIcon}>
          <Feather name="eye-off" size={rs.font(16)} color={BRAND} />
        </View>
        <View style={styles.optInBody}>
          <Text style={styles.optInTitle}>You&apos;re hidden</Text>
          <Text style={styles.optInHint} numberOfLines={1}>
            Turn on visibility to compete.
          </Text>
        </View>
        <View style={styles.optInCta}>
          <Text style={styles.optInCtaText}>Profile</Text>
          <Feather name="chevron-right" size={rs.font(14)} color="#0A0A0A" />
        </View>
      </Pressable>
    </View>
  );
}

// Soft teaser card so users know the social layer (following the top
// profitable predictors) is on the roadmap. Pure-display — no CTA.
function FollowComingSoonNote() {
  return (
    <View style={styles.comingSoonWrap}>
      <View style={styles.comingSoonCard}>
        <View style={styles.comingSoonIcon}>
          <Feather name="user-plus" size={rs.font(16)} color={BRAND} />
        </View>
        <View style={styles.comingSoonBody}>
          <View style={styles.comingSoonHeaderRow}>
            <Text style={styles.comingSoonTitle}>Follow top predictors</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>SOON</Text>
            </View>
          </View>
          <Text style={styles.comingSoonHint}>
            Soon you go fit follow the most profitable predictors and copy
            their picks straight from this board.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Empty / error ─────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Feather name="alert-circle" size={rs.font(22)} color="#FF8A8A" />
      </View>
      <Text style={styles.emptyTitle}>Couldn&apos;t load the board</Text>
      <Text style={styles.emptyHint}>Check your connection and try again.</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.retryBtnText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Feather name="award" size={rs.font(22)} color="#888888" />
      </View>
      <Text style={styles.emptyTitle}>No winners yet</Text>
      <Text style={styles.emptyHint}>
        Once people start winning bets, they go land here.
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingBottom: rs.size(140),
  },

  // Header
  header: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(16),
    paddingBottom: rs.size(8),
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(26),
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(5),
    borderRadius: rs.size(9999),
    backgroundColor: '#1A0F03',
    borderWidth: 1,
    borderColor: '#3A2410',
  },
  headerBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: BRAND,
    letterSpacing: 0.5,
  },
  headerMeta: {
    marginTop: rs.size(6),
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#666666',
    letterSpacing: 0.6,
  },

  // Podium
  podiumWrap: {
    marginTop: rs.size(20),
    marginHorizontal: rs.size(16),
    paddingTop: rs.size(8),
    paddingBottom: rs.size(0),
    backgroundColor: SURFACE,
    borderRadius: rs.size(20),
    borderWidth: 1,
    borderColor: HAIRLINE,
    overflow: 'hidden',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: rs.size(20),
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  podiumCardWrap: {
    alignItems: 'center',
    paddingHorizontal: rs.size(4),
    width: '100%',
  },
  crownWrap: {
    marginBottom: rs.size(4),
  },
  avatarStack: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  winnerHalo: {
    position: 'absolute',
    backgroundColor: GOLD,
    opacity: 0.25,
  },
  podiumAvatar: {
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  rankChip: {
    position: 'absolute',
    bottom: -rs.size(4),
    minWidth: rs.size(22),
    height: rs.size(22),
    borderRadius: rs.size(9999),
    paddingHorizontal: rs.size(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: rs.size(2),
    borderColor: SURFACE,
  },
  rankChipText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: '#0A0A0A',
    includeFontPadding: false,
  },
  podiumName: {
    marginTop: rs.size(12),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: '100%',
  },
  podiumNameWinner: {
    fontSize: rs.font(14),
    fontFamily: Fonts.bold,
  },
  podiumNameMe: {
    color: BRAND,
  },
  podiumNamePlaceholder: {
    marginTop: rs.size(12),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#3A3A3A',
    textAlign: 'center',
  },
  podiumWins: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#777777',
    textAlign: 'center',
  },

  // Pedestal
  pedestal: {
    width: '85%',
    marginTop: rs.size(10),
    borderTopLeftRadius: rs.size(8),
    borderTopRightRadius: rs.size(8),
    borderTopWidth: rs.size(3),
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: rs.size(8),
  },
  pedestalRank: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#2A2A2A',
    includeFontPadding: false,
  },

  // List
  listSection: {
    marginTop: rs.size(28),
    marginHorizontal: rs.size(16),
  },
  sectionLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: '#777777',
    letterSpacing: 0.8,
    marginBottom: rs.size(10),
    paddingHorizontal: rs.size(4),
  },
  listCard: {
    backgroundColor: SURFACE,
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: HAIRLINE,
    overflow: 'hidden',
  },
  footerLoader: {
    paddingVertical: rs.size(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfList: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#555555',
    textAlign: 'center',
    letterSpacing: 0.6,
    paddingVertical: rs.size(20),
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(14),
    gap: rs.size(12),
  },
  rankRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  rankRowMe: {
    backgroundColor: '#1A0F03',
  },
  rankRowNum: {
    width: rs.size(28),
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#666666',
    includeFontPadding: false,
  },
  rankRowAvatar: {
    width: rs.size(40),
    height: rs.size(40),
    borderRadius: rs.size(9999),
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRowAvatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  rankRowMid: {
    flex: 1,
    minWidth: 0,
  },
  rankRowName: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  youTag: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: BRAND,
  },
  rankRowSub: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#666666',
  },
  rankRowRight: {
    alignItems: 'flex-end',
    maxWidth: rs.wp(28),
  },

  // Profit
  profitText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  profitTextEmphasis: {
    fontSize: rs.font(15),
  },
  profitPos: {
    color: '#5BD37A',
  },
  profitNeg: {
    color: '#FF6B6B',
  },

  // Sticky footers
  footerWrap: {
    position: 'absolute',
    left: rs.size(16),
    right: rs.size(16),
    bottom: rs.size(16),
  },
  youCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    backgroundColor: '#160B02',
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: BRAND,
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(14),
  },
  youRankBadge: {
    minWidth: rs.size(48),
    height: rs.size(40),
    borderRadius: rs.size(12),
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs.size(10),
  },
  youRankBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
    includeFontPadding: false,
  },
  youCardMid: {
    flex: 1,
    minWidth: 0,
  },
  youCardLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(10),
    color: BRAND,
    letterSpacing: 0.7,
  },
  youCardName: {
    marginTop: rs.size(2),
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },

  // Pinned-to-top wrapper for the opt-in CTA. Horizontal insets mirror the
  // other top-of-screen elements (Header) so the banner aligns with the
  // overall page grid rather than the bottom safe-area inset.
  topNoticeWrap: {
    paddingHorizontal: rs.size(16),
    paddingTop: rs.size(4),
    paddingBottom: rs.size(8),
  },
  optInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    backgroundColor: '#1A1208',
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: '#3A2410',
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(12),
  },
  // "Follow top predictors — coming soon" note shown at the bottom of the
  // ranked list. Sits flush with the same horizontal grid as the rankings.
  comingSoonWrap: {
    marginTop: rs.size(20),
    paddingHorizontal: rs.size(16),
  },
  comingSoonCard: {
    flexDirection: 'row',
    gap: rs.size(12),
    backgroundColor: SURFACE,
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: HAIRLINE,
    paddingVertical: rs.size(14),
    paddingHorizontal: rs.size(14),
    borderStyle: 'dashed',
  },
  comingSoonIcon: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(9999),
    backgroundColor: '#1A1208',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonBody: {
    flex: 1,
    minWidth: 0,
  },
  comingSoonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  comingSoonTitle: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
    flexShrink: 1,
  },
  comingSoonBadge: {
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(2),
    borderRadius: rs.size(9999),
    backgroundColor: '#2A1808',
    borderWidth: 1,
    borderColor: '#3A2410',
  },
  comingSoonBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(9),
    color: BRAND,
    letterSpacing: 1,
  },
  comingSoonHint: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    lineHeight: rs.font(17),
    color: '#888888',
  },
  optInIcon: {
    width: rs.size(40),
    height: rs.size(40),
    borderRadius: rs.size(9999),
    backgroundColor: '#2A1808',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optInBody: {
    flex: 1,
    minWidth: 0,
  },
  optInTitle: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  optInHint: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#A88460',
  },
  optInCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(2),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(8),
    borderRadius: rs.size(9999),
    backgroundColor: BRAND,
  },
  optInCtaText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#0A0A0A',
  },

  // States
  center: {
    paddingTop: rs.size(48),
    paddingHorizontal: rs.size(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: rs.size(56),
    height: rs.size(56),
    borderRadius: rs.size(9999),
    backgroundColor: SURFACE_2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs.size(12),
  },
  emptyTitle: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#777777',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: rs.size(16),
    paddingHorizontal: rs.size(20),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(9999),
    backgroundColor: BRAND,
  },
  retryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#0A0A0A',
  },
});
