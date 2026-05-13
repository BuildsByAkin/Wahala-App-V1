// app/market/[slug].tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useMarket, type DetailOutcome } from '@/hooks/useMarket';
import { useComments, type Comment } from '@/hooks/useComments';
import { useToggleLike } from '@/hooks/useToggleLike';
import {
  formatClosesIn,
  getAvatarColor,
  getInitial,
  outcomeColor,
  timeAgo,
} from '@/utils/market';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { useAuth } from '@/features/auth';
import { BetSheet } from '@/features/betting';

function leadingOutcomeIndex(outcomes: DetailOutcome[]): number {
  if (outcomes.length === 0) return -1;
  let bestIdx = 0;
  let bestPct = -Infinity;
  outcomes.forEach((o, i) => {
    if (o.sharePercent > bestPct) {
      bestPct = o.sharePercent;
      bestIdx = i;
    }
  });
  return bestPct > 0 ? bestIdx : -1;
}

function usePulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function useDotPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.6,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return { scale, opacity };
}

function SkeletonBody() {
  const opacity = usePulse();
  return (
    <View style={styles.skeletonWrap}>
      <Animated.View style={[styles.skeleton, { height: rs.size(80), marginTop: rs.size(12), opacity }]} />
      <Animated.View style={[styles.skeleton, { height: rs.size(180), marginTop: rs.size(12), opacity }]} />
      <Animated.View style={[styles.skeleton, { height: rs.size(100), marginTop: rs.size(12), opacity }]} />
    </View>
  );
}

function SplitBar({ outcomes, poolExists }: { outcomes: DetailOutcome[]; poolExists: boolean }) {
  const totalPct = outcomes.reduce((sum, o) => sum + Math.max(0, o.sharePercent), 0);
  if (!poolExists || outcomes.length === 0 || totalPct <= 0) {
    return <View style={[styles.splitBar, styles.splitBarNeutral]} />;
  }
  return (
    <View style={styles.splitBar}>
      {outcomes.map((o, i) => {
        const pct = Math.max(0, o.sharePercent);
        if (pct <= 0) return null;
        return (
          <View
            key={o.id}
            style={{ flex: pct, backgroundColor: outcomeColor(i) }}
          />
        );
      })}
    </View>
  );
}

function OutcomeRow({
  outcome,
  index,
  isLeading,
  poolExists,
  onPress,
}: {
  outcome: DetailOutcome;
  index: number;
  isLeading: boolean;
  poolExists: boolean;
  onPress: (outcome: DetailOutcome, index: number) => void;
}) {
  const color = outcomeColor(index);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={() => onPress(outcome, index)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Stake on ${outcome.label}`}
      accessibilityHint="Opens the betting sheet"
    >
      <Animated.View
        style={[
          styles.outcomeRow,
          isLeading && styles.outcomeRowLeading,
          { transform: [{ scale }] },
        ]}
      >
        <View style={[styles.outcomeAccent, { backgroundColor: color }]} />
        <View style={styles.outcomeLeftWrap}>
          <View style={[styles.outcomeDot, { backgroundColor: color }]} />
          <Text style={styles.outcomeLabel} numberOfLines={1}>
            {outcome.label}
          </Text>
        </View>
        {poolExists ? (
          <Text style={isLeading ? styles.percentLeading : styles.percentOther}>
            {outcome.sharePercent}%
          </Text>
        ) : (
          <Text style={styles.percentDash}>—</Text>
        )}
        {poolExists ? (
          <View style={styles.multiplierPill}>
            <Text style={[styles.multiplierText, { color }]}>
              {outcome.multiplier}x
            </Text>
          </View>
        ) : (
          <View style={styles.multiplierPlaceholder} />
        )}
        <View style={[styles.stakeChip, { backgroundColor: `${color}1A`, borderColor: `${color}55` }]}>
          <Text style={[styles.stakeChipText, { color }]}>STAKE</Text>
          <Feather name="chevron-right" size={rs.font(14)} color={color} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function PulseStrip({ bettorCount }: { bettorCount: number }) {
  const { scale, opacity } = useDotPulse();
  if (bettorCount > 0) {
    return (
      <View style={styles.pulseStrip}>
        <View style={styles.pulseDotWrap}>
          <Animated.View
            style={[
              styles.pulseDotRing,
              { transform: [{ scale }], opacity },
            ]}
          />
          <View style={styles.pulseDotCore} />
        </View>
        <Text style={styles.pulseText}>
          {bettorCount} {bettorCount === 1 ? 'person' : 'people'} dey stake
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.pulseStrip}>
      <Text style={styles.pulseTextEmpty}>No bets yet — be the first</Text>
    </View>
  );
}

function CommentRow({
  comment,
  outcomeIndexByLabel,
  onToggleLike,
  isPending,
}: {
  comment: Comment;
  outcomeIndexByLabel: Map<string, number>;
  onToggleLike: (commentId: string) => void;
  isPending: boolean;
}) {
  const avatarColor = getAvatarColor(comment.author.userId);
  const initial = getInitial(comment.author.displayName, comment.author.username);
  const name = comment.author.displayName || comment.author.username;

  const betLabel = comment.bet?.outcomeLabel ?? null;
  const betIdx = betLabel != null ? outcomeIndexByLabel.get(betLabel) : undefined;
  const betColor = typeof betIdx === 'number' ? outcomeColor(betIdx) : '#FF6500';
  const betBg = `${betColor}26`; // 15% opacity
  const betBorder = `${betColor}66`; // 40% opacity

  const liked = comment.hasLiked;
  const heartColor = liked ? '#FF6500' : '#3A3A3A';

  return (
    <View style={styles.commentRow}>
      <View style={[styles.avatar36, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatar36Text}>{initial}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentName}>{name}</Text>
          {betLabel && (
            <View
              style={[
                styles.betPill,
                { backgroundColor: betBg, borderColor: betBorder },
              ]}
            >
              <Text style={[styles.betPillText, { color: betColor }]}>
                {betLabel}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.commentText}>{comment.body}</Text>
        <View style={styles.commentMeta}>
          <Text style={styles.metaText}>{timeAgo(comment.createdAt)}</Text>
          <Pressable
            onPress={() => onToggleLike(comment.id)}
            disabled={isPending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike comment' : 'Like comment'}
            style={styles.metaIconGroup}
          >
            <Feather name="heart" size={rs.font(13)} color={heartColor} />
            <Text style={[styles.metaText, { color: heartColor }]}>
              {comment.likeCount}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function MarketDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : undefined;

  const { market, outcomes, isLoading, isError } = useMarket(slug);
  const { comments, isLoading: commentsLoading } = useComments(market?.id);
  const { userId, displayName, username } = useAuth();

  const poolExists = !!market && market.totalPoolKobo !== '0';
  const leadingIdx = useMemo(() => leadingOutcomeIndex(outcomes), [outcomes]);

  const outcomeIndexByLabel = useMemo(() => {
    const map = new Map<string, number>();
    outcomes.forEach((o, i) => map.set(o.label, i));
    return map;
  }, [outcomes]);

  const myAvatarColor = getAvatarColor(userId ?? 'me');
  const myInitial = getInitial(displayName, username ?? '?');

  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<DetailOutcome | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const toggleLikeMutation = useToggleLike(market?.id);

  const handleToggleLike = (commentId: string) => {
    if (pendingLikes.has(commentId)) return;
    setPendingLikes((prev) => {
      const next = new Set(prev);
      next.add(commentId);
      return next;
    });
    toggleLikeMutation.mutate(commentId, {
      onSettled: () => {
        setPendingLikes((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      },
    });
  };

  const handleOutcomePress = (outcome: DetailOutcome, index: number) => {
    setSelectedOutcome(outcome);
    setSelectedIndex(index);
    setBetSheetOpen(true);
  };

  const handleInputPress = () => {
    Alert.alert('Stake first', 'You need an active bet to join the gist.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Zone 1 — Top bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={rs.font(22)} color="#FFFFFF" />
        </Pressable>
        {market ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{market.category.toUpperCase()}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Text style={styles.headerCloses}>
          {market ? formatClosesIn(market.closesAt) : ''}
        </Text>
      </View>

      <View style={styles.body}>
        <MarketBody
          market={market}
          outcomes={outcomes}
          isLoading={isLoading}
          isError={isError}
          poolExists={poolExists}
          leadingIdx={leadingIdx}
          handleOutcomePress={handleOutcomePress}
          comments={comments}
          commentsLoading={commentsLoading}
          outcomeIndexByLabel={outcomeIndexByLabel}
          handleToggleLike={handleToggleLike}
          pendingLikes={pendingLikes}
        />


        {/* Pinned comment bar */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom + rs.size(10) },
          ]}
        >
          <View style={[styles.avatar32, { backgroundColor: myAvatarColor }]}>
            <Text style={styles.avatar32Text}>{myInitial}</Text>
          </View>
          <Pressable
            style={styles.inputPressable}
            onPress={handleInputPress}
            accessibilityRole="button"
            accessibilityLabel="Open comment composer"
            accessibilityHint="Requires an active bet on this market"
          >
            <Text style={styles.inputPlaceholder}>Drop your take...</Text>
          </Pressable>
        </View>
      </View>

      <BetSheet
        visible={betSheetOpen}
        market={market ?? null}
        outcome={selectedOutcome}
        outcomeIndex={selectedIndex}
        onClose={() => setBetSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── MarketBody ──────────────────────────────────────────────────────────────
// Comments live in a FlashList so the row count can grow without dropping
// frames. The market hero, stadium, stats, and section divider live in the
// list header — they scroll with the comments but only render once.

type MarketBodyProps = {
  market: import('@/hooks/useMarket').MarketDetail | undefined;
  outcomes: DetailOutcome[];
  isLoading: boolean;
  isError: boolean;
  poolExists: boolean;
  leadingIdx: number;
  handleOutcomePress: (o: DetailOutcome, i: number) => void;
  comments: Comment[];
  commentsLoading: boolean;
  outcomeIndexByLabel: Map<string, number>;
  handleToggleLike: (commentId: string) => void;
  pendingLikes: Set<string>;
};

function MarketBody({
  market,
  outcomes,
  isLoading,
  isError,
  poolExists,
  leadingIdx,
  handleOutcomePress,
  comments,
  commentsLoading,
  outcomeIndexByLabel,
  handleToggleLike,
  pendingLikes,
}: MarketBodyProps) {
  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentRow
        comment={item}
        outcomeIndexByLabel={outcomeIndexByLabel}
        onToggleLike={handleToggleLike}
        isPending={pendingLikes.has(item.id)}
      />
    ),
    [outcomeIndexByLabel, handleToggleLike, pendingLikes]
  );

  if (isLoading) return <SkeletonBody />;
  if (isError || !market) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>
          Couldn&apos;t load this market. Try again in a moment.
        </Text>
      </View>
    );
  }

  const Header = (
    <View>
      <View style={styles.questionBlock}>
        <Text style={styles.question}>{market.question}</Text>
        {market.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {market.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.stadium}>
        <SplitBar outcomes={outcomes} poolExists={poolExists} />
        <View style={styles.tapHintRow}>
          <Feather name="zap" size={rs.font(11)} color="#FF6500" />
          <Text style={styles.tapHintText}>TAP A SIDE TO STAKE</Text>
        </View>
        <View style={styles.outcomeList}>
          {outcomes.map((o, i) => (
            <OutcomeRow
              key={o.id}
              outcome={o}
              index={i}
              isLeading={poolExists && i === leadingIdx}
              poolExists={poolExists}
              onPress={handleOutcomePress}
            />
          ))}
        </View>
        <PulseStrip bettorCount={market.bettorCount} />
      </View>

      <View style={styles.statsStrip}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>
            ₦{formatKoboAsNaira(market.totalPoolKobo)}
          </Text>
          <Text style={styles.statLabel}>POOL</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{market.bettorCount}</Text>
          <Text style={styles.statLabel}>STAKERS</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>
            ₦{formatKoboAsNaira(market.minStakeKobo)}
          </Text>
          <Text style={styles.statLabel}>MIN BET</Text>
        </View>
      </View>
      <Text style={styles.feeLine}>
        House takes {market.feeBps / 100}% · Closes{' '}
        {formatClosesIn(market.closesAt)}
      </Text>

      <View style={styles.crowdDivider}>
        <View style={styles.crowdLine} />
        <Text style={styles.crowdLabel}>THE GIST</Text>
        <View style={styles.crowdLine} />
      </View>

      {commentsLoading ? (
        <View style={styles.commentSkeletons}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.commentSkeleton} />
          ))}
        </View>
      ) : null}
    </View>
  );

  const Empty =
    !commentsLoading && comments.length === 0 ? (
      <View style={styles.emptyComments}>
        <Text style={styles.emptyTitle}>Nobody don talk yet</Text>
        <Text style={styles.emptySubtitle}>
          Drop a take when betting opens
        </Text>
      </View>
    ) : null;

  return (
    <FlashList
      data={commentsLoading ? [] : comments}
      renderItem={renderComment}
      keyExtractor={(c) => c.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      ListHeaderComponent={Header}
      ListEmptyComponent={Empty}
    />
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  body: { flex: 1 },
  scrollContent: { paddingBottom: rs.size(120) },

  // Zone 1
  header: {
    paddingHorizontal: rs.size(20),
    paddingVertical: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs.size(12),
  },
  backBtn: {
    width: rs.size(28),
    height: rs.size(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    backgroundColor: '#1A1A1A',
    borderRadius: rs.size(20),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(5),
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: '#FF6500',
    letterSpacing: 0.5,
  },
  headerCloses: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888888',
  },

  // Zone 2
  questionBlock: {
    paddingHorizontal: rs.size(20),
    marginTop: rs.size(20),
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(26),
    color: '#FFFFFF',
    lineHeight: rs.font(34),
  },
  description: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#666666',
    lineHeight: rs.font(19),
  },

  // Zone 3 — Stadium
  stadium: {
    marginTop: rs.size(28),
    paddingHorizontal: rs.size(20),
  },
  splitBar: {
    height: rs.size(10),
    borderRadius: rs.size(5),
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: rs.size(20),
  },
  splitBarNeutral: { backgroundColor: '#222222' },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    marginBottom: rs.size(8),
  },
  tapHintText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#FF6500',
    letterSpacing: 1.2,
  },
  outcomeList: {
    gap: rs.size(8),
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs.size(14),
    paddingLeft: rs.size(14),
    paddingRight: rs.size(10),
    backgroundColor: '#0F0F0F',
    borderRadius: rs.size(14),
    borderWidth: 1,
    borderColor: '#161616',
    overflow: 'hidden',
  },
  outcomeRowLeading: {
    borderColor: '#2A1A0A',
    backgroundColor: '#120D08',
  },
  outcomeAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: rs.size(3),
  },
  outcomeLeftWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  outcomeDot: {
    width: rs.size(10),
    height: rs.size(10),
    borderRadius: rs.size(5),
  },
  outcomeLabel: {
    marginLeft: rs.size(12),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(16),
    color: '#FFFFFF',
    flexShrink: 1,
  },
  percentLeading: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#FF6500',
    marginRight: rs.size(12),
  },
  percentOther: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: '#AAAAAA',
    marginRight: rs.size(12),
  },
  percentDash: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#333333',
    marginRight: rs.size(12),
  },
  multiplierPill: {
    backgroundColor: '#1A1A1A',
    borderRadius: rs.size(8),
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(4),
    minWidth: rs.size(50),
    alignItems: 'center',
  },
  multiplierText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
  },
  multiplierPlaceholder: {
    minWidth: rs.size(50),
  },

  // Pulse strip
  pulseStrip: {
    marginTop: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  pulseDotWrap: {
    width: rs.size(10),
    height: rs.size(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotRing: {
    position: 'absolute',
    width: rs.size(10),
    height: rs.size(10),
    borderRadius: rs.size(5),
    backgroundColor: '#FF6500',
  },
  pulseDotCore: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
    backgroundColor: '#FF6500',
  },
  pulseText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
  },
  pulseTextEmpty: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#444444',
  },

  // Zone 4 — Stats
  statsStrip: {
    marginTop: rs.size(20),
    marginHorizontal: rs.size(20),
    backgroundColor: '#111111',
    borderRadius: rs.size(16),
    paddingVertical: rs.size(14),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
  },
  statLabel: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#555555',
    letterSpacing: 0.6,
  },
  statSep: {
    width: 1,
    height: rs.size(28),
    backgroundColor: '#1F1F1F',
  },
  feeLine: {
    marginTop: rs.size(10),
    paddingHorizontal: rs.size(20),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#444444',
    textAlign: 'center',
  },

  // Zone 5
  crowdDivider: {
    marginTop: rs.size(28),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
  },
  crowdLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1A1A1A',
  },
  crowdLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FF6500',
    letterSpacing: 1.5,
  },

  // Zone 6 — Comments
  commentSkeletons: { marginTop: rs.size(12) },
  commentSkeleton: {
    height: rs.size(70),
    backgroundColor: '#111111',
    borderRadius: rs.size(12),
    marginHorizontal: rs.size(20),
    marginBottom: rs.size(10),
  },
  emptyComments: {
    paddingVertical: rs.size(48),
    paddingHorizontal: rs.size(40),
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    color: '#333333',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#2A2A2A',
    textAlign: 'center',
  },
  commentList: { marginTop: rs.size(4) },

  commentRow: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(16),
    paddingBottom: rs.size(16),
    borderBottomWidth: 1,
    borderBottomColor: '#0F0F0F',
    flexDirection: 'row',
  },
  avatar36: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar36Text: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  commentBody: {
    flex: 1,
    marginLeft: rs.size(12),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  commentName: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  betPill: {
    marginLeft: 'auto',
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(7),
    paddingVertical: rs.size(2),
    borderWidth: 1,
  },
  betPillText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
  },
  commentText: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#BBBBBB',
    lineHeight: rs.font(20),
  },
  commentMeta: {
    marginTop: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(16),
  },
  metaIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  metaText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#3A3A3A',
  },

  // Pinned input
  inputBar: {
    backgroundColor: '#080808',
    borderTopWidth: 1,
    borderTopColor: '#151515',
    paddingHorizontal: rs.size(16),
    paddingTop: rs.size(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
  },
  avatar32: {
    width: rs.size(32),
    height: rs.size(32),
    borderRadius: rs.size(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar32Text: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  inputPressable: {
    flex: 1,
    backgroundColor: '#151515',
    borderRadius: rs.size(20),
    height: rs.size(40),
    paddingHorizontal: rs.size(16),
    justifyContent: 'center',
  },
  inputPlaceholder: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#333333',
  },

  // Skeleton + error
  skeletonWrap: { paddingHorizontal: rs.size(20) },
  skeleton: {
    backgroundColor: '#111111',
    borderRadius: rs.size(16),
  },
  errorWrap: {
    paddingHorizontal: rs.size(24),
    paddingVertical: rs.size(48),
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#888888',
    textAlign: 'center',
  },

  // Stake chip on outcome row
  stakeChip: {
    marginLeft: rs.size(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(2),
    borderRadius: rs.size(999),
    borderWidth: 1,
    paddingLeft: rs.size(10),
    paddingRight: rs.size(6),
    paddingVertical: rs.size(5),
  },
  stakeChipText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1,
  },

});
