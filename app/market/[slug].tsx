import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useMarket, type DetailOutcome } from '@/hooks/useMarket';
import { useComments, type Comment } from '@/hooks/useComments';
import { useToggleLike } from '@/hooks/useToggleLike';
import { useCreateComment } from '@/hooks/useCreateComment';
import { CommentComposerSheet } from '@/components/market/comment-composer-sheet';
import { OutcomeRow } from '@/components/market/outcome-row';
import { StatsStrip } from '@/components/market/stats-strip';
import { StatusPill } from '@/components/market/status-pill';
import { PulseRail } from '@/components/market/pulse-rail';
import { SidePanel, type PanelState } from '@/components/market/side-panel';
import {
  getAvatarColor,
  getInitial,
  outcomeColor,
  timeAgo,
} from '@/utils/market';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuth } from '@/features/auth';
import {
  LockedNoticeSheet,
  StakeSheet,
  groupBetsIntoPositions,
  useMyBets,
} from '@/features/betting';

const PULSE_YES = '#14B8A6';
const PULSE_NO = '#6366F1';

function isYesLabel(label: string) {
  return /^y(es)?$/i.test(label.trim());
}
function isNoLabel(label: string) {
  return /^n(o)?$/i.test(label.trim());
}

function shortTag(label: string): string {
  const trimmed = label.trim();
  if (isYesLabel(trimmed)) return 'YES';
  if (isNoLabel(trimmed)) return 'NO';
  return trimmed.slice(0, 3).toUpperCase();
}

function CommentRow({
  comment,
  outcomeIndexByLabel,
  onToggleLike,
  isPending,
  resolveColor,
}: {
  comment: Comment;
  outcomeIndexByLabel: Map<string, number>;
  onToggleLike: (commentId: string) => void;
  isPending: boolean;
  resolveColor: (index: number) => string;
}) {
  const avatarColor = getAvatarColor(comment.author.userId);
  const initial = getInitial(comment.author.displayName, comment.author.username);
  const name = comment.author.displayName || comment.author.username;

  const betLabel = comment.bet?.outcomeLabel ?? null;
  const betIdx = betLabel != null ? outcomeIndexByLabel.get(betLabel) : undefined;
  const betColor = typeof betIdx === 'number' ? resolveColor(betIdx) : Colors.text.secondary;
  const betBg = `${betColor}26`;
  const betBorder = `${betColor}66`;

  const liked = comment.hasLiked;
  const heartColor = liked ? Colors.brand : Colors.border.strong;

  return (
    <View style={styles.commentRow}>
      <View style={[styles.avatar36, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatar36Text}>{initial}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentName}>{name}</Text>
          {betLabel && (
            <View style={[styles.betPill, { backgroundColor: betBg, borderColor: betBorder }]}>
              <Text style={[styles.betPillText, { color: betColor }]}>{betLabel}</Text>
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
            <Text style={[styles.metaText, { color: heartColor }]}>{comment.likeCount}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function MarketDetailScreenWrapper() {
  return (
    <ErrorBoundary label="MarketDetail">
      <MarketDetailScreen />
    </ErrorBoundary>
  );
}

function MarketDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = typeof params.slug === 'string' ? params.slug : undefined;

  const { market, outcomes, isLoading, isError } = useMarket(slug);
  const { comments, isLoading: commentsLoading } = useComments(market?.id);
  const { userId, displayName, username } = useAuth();
  const { bets: myActiveBets } = useMyBets({ status: 'active' });

  const myStakeByOutcomeId = useMemo(() => {
    if (!market) return new Map<string, string>();
    const positions = groupBetsIntoPositions(myActiveBets).filter((p) => p.marketId === market.id);
    const map = new Map<string, string>();
    for (const p of positions) map.set(p.outcomeId, p.totalStakeKobo);
    return map;
  }, [myActiveBets, market]);

  const lockedOutcomeId = useMemo<string | null>(() => {
    const first = myStakeByOutcomeId.keys().next();
    return first.done ? null : first.value;
  }, [myStakeByOutcomeId]);

  const lockedOutcome = useMemo(
    () => (lockedOutcomeId ? outcomes.find((o) => o.id === lockedOutcomeId) ?? null : null),
    [lockedOutcomeId, outcomes]
  );
  const lockedOutcomeIndex = useMemo(
    () => (lockedOutcomeId ? outcomes.findIndex((o) => o.id === lockedOutcomeId) : -1),
    [lockedOutcomeId, outcomes]
  );

  const poolExists = !!market && market.totalPoolKobo !== '0';
  const isOpen = market?.status === 'open' || market?.status === 'scheduled';
  const isLocked = market?.status === 'locked';
  const isResolved = market?.status === 'resolved';
  const isClosed = !isOpen;
  const isBinary = outcomes.length === 2;

  const binaryColors = useMemo<[string, string]>(() => {
    if (!isBinary) return [PULSE_YES, PULSE_NO];
    const [a, b] = outcomes;
    if (isYesLabel(a.label)) return [PULSE_YES, PULSE_NO];
    if (isYesLabel(b.label)) return [PULSE_NO, PULSE_YES];
    return [PULSE_YES, PULSE_NO];
  }, [isBinary, outcomes]);

  const outcomeIndexByLabel = useMemo(() => {
    const map = new Map<string, number>();
    outcomes.forEach((o, i) => map.set(o.label, i));
    return map;
  }, [outcomes]);

  const resolveOutcomeColor = useCallback(
    (index: number): string => {
      if (isBinary) return binaryColors[index] ?? outcomeColor(index);
      return outcomeColor(index);
    },
    [isBinary, binaryColors]
  );

  const myAvatarColor = getAvatarColor(userId ?? 'me');
  const myInitial = getInitial(displayName, username ?? '?');

  const [betSheetOpen, setBetSheetOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<DetailOutcome | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [originY, setOriginY] = useState<number | undefined>(undefined);
  const [lockedNoticeOpen, setLockedNoticeOpen] = useState(false);
  const [attemptedLabel, setAttemptedLabel] = useState<string | null>(null);

  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const toggleLikeMutation = useToggleLike(market?.id);

  const [composerOpen, setComposerOpen] = useState(false);
  const createCommentMutation = useCreateComment(market?.id);

  const yesRef = useRef<View>(null);
  const noRef = useRef<View>(null);

  const handleToggleLike = useCallback(
    (commentId: string) => {
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
    },
    [pendingLikes, toggleLikeMutation]
  );

  const openStakeFor = useCallback(
    (outcome: DetailOutcome, index: number, panelRef?: React.RefObject<View | null>) => {
      if (!market) return;
      if (!isOpen) return;
      if (lockedOutcomeId && lockedOutcomeId !== outcome.id) {
        setAttemptedLabel(outcome.label);
        setLockedNoticeOpen(true);
        return;
      }
      Haptics.selectionAsync().catch(() => {});
      setSelectedOutcome(outcome);
      setSelectedIndex(index);

      const present = () => setBetSheetOpen(true);

      const ref = panelRef?.current;
      if (ref && typeof ref.measureInWindow === 'function') {
        try {
          ref.measureInWindow((_x, y, _w, h) => {
            setOriginY(y + h / 2);
            present();
          });
        } catch {
          setOriginY(undefined);
          present();
        }
      } else {
        setOriginY(undefined);
        present();
      }
    },
    [market, isOpen, lockedOutcomeId]
  );

  const handleOutcomePress = (outcome: DetailOutcome) => {
    const index = outcomes.findIndex((o) => o.id === outcome.id);
    openStakeFor(outcome, index);
  };

  const handleAddToLocked = () => {
    if (!lockedOutcome || lockedOutcomeIndex < 0) return;
    setLockedNoticeOpen(false);
    setTimeout(() => openStakeFor(lockedOutcome, lockedOutcomeIndex), 180);
  };

  const hasActivePosition = myStakeByOutcomeId.size > 0;
  const composerEnabled = isOpen && hasActivePosition;

  const handleInputPress = () => {
    if (!market) return;
    if (!isOpen) return;
    if (!hasActivePosition) {
      Alert.alert('Stake first', 'You need an active bet to join the gist.');
      return;
    }
    setComposerOpen(true);
  };

  const handleSubmitComment = (body: string) => {
    if (!market) return;
    createCommentMutation.mutate(
      { body },
      {
        onSuccess: () => setComposerOpen(false),
        onError: (err) => {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Could not post your comment. Try again.';
          Alert.alert('Comment failed', message);
        },
      }
    );
  };

  const selectedColor =
    selectedOutcome && isBinary
      ? binaryColors[selectedIndex]
      : selectedOutcome
      ? outcomeColor(selectedIndex)
      : Colors.brand;
  const selectedTag = selectedOutcome ? shortTag(selectedOutcome.label) : '';

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentRow
        comment={item}
        outcomeIndexByLabel={outcomeIndexByLabel}
        onToggleLike={handleToggleLike}
        isPending={pendingLikes.has(item.id)}
        resolveColor={resolveOutcomeColor}
      />
    ),
    [outcomeIndexByLabel, pendingLikes, resolveOutcomeColor, handleToggleLike]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={rs.font(22)} color={Colors.text.primary} />
          </Pressable>
          <View />
          <View style={{ width: rs.size(36) }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={rs.font(22)} color={Colors.text.primary} />
        </Pressable>
        {market ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{market.category.toUpperCase()}</Text>
          </View>
        ) : (
          <View />
        )}
        {market ? (
          <StatusPill status={market.status} closesAt={market.closesAt} />
        ) : (
          <View style={{ width: rs.size(36) }} />
        )}
      </View>

      <View style={styles.body}>
        {isError || !market ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>Couldn&apos;t load this market. Try again in a moment.</Text>
          </View>
        ) : (
          <MarketBody
            market={market}
            outcomes={outcomes}
            poolExists={poolExists}
            isOpen={isOpen}
            isLocked={isLocked}
            isResolved={isResolved}
            isClosed={isClosed}
            isBinary={isBinary}
            binaryColors={binaryColors}
            resolveOutcomeColor={resolveOutcomeColor}
            onPressOutcome={handleOutcomePress}
            onPressYes={(o, i) => openStakeFor(o, i, yesRef)}
            onPressNo={(o, i) => openStakeFor(o, i, noRef)}
            yesRef={yesRef}
            noRef={noRef}
            selectedOutcomeId={betSheetOpen ? selectedOutcome?.id ?? null : null}
            comments={comments}
            commentsLoading={commentsLoading}
            outcomeIndexByLabel={outcomeIndexByLabel}
            renderComment={renderComment}
            myStakeByOutcomeId={myStakeByOutcomeId}
            lockedOutcomeId={lockedOutcomeId}
          />
        )}

        {composerEnabled || isOpen ? (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + rs.size(10) }]}>
            <View style={[styles.avatar32, { backgroundColor: myAvatarColor }]}>
              <Text style={styles.avatar32Text}>{myInitial}</Text>
            </View>
            <Pressable
              style={styles.inputPressable}
              onPress={handleInputPress}
              accessibilityRole="button"
              accessibilityLabel="Open comment composer"
              accessibilityHint={
                hasActivePosition ? 'Post a comment on this market' : 'Requires an active bet on this market'
              }
            >
              <Text style={styles.inputPlaceholder}>
                {hasActivePosition ? 'Drop your take...' : 'Stake first to join the gist'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.closedFootnote, { paddingBottom: insets.bottom + rs.size(14) }]}>
            <Feather name="lock" size={rs.font(12)} color={Colors.text.tertiary} />
            <Text style={styles.closedFootnoteText}>
              {isResolved
                ? 'Market resolved · takes are read-only'
                : 'Market closed · waiting on resolution'}
            </Text>
          </View>
        )}
      </View>

      <StakeSheet
        visible={betSheetOpen}
        market={market ?? null}
        outcome={selectedOutcome}
        outcomeIndex={selectedIndex}
        color={selectedColor}
        sideTag={selectedTag}
        originY={originY}
        myStakeKoboOnOutcome={selectedOutcome ? myStakeByOutcomeId.get(selectedOutcome.id) ?? null : null}
        onClose={() => setBetSheetOpen(false)}
      />

      <CommentComposerSheet
        visible={composerOpen}
        avatarColor={myAvatarColor}
        avatarInitial={myInitial}
        outcomeLabel={lockedOutcome?.label ?? null}
        outcomeColor={lockedOutcomeIndex >= 0 ? resolveOutcomeColor(lockedOutcomeIndex) : Colors.brand}
        isSubmitting={createCommentMutation.isPending}
        onSubmit={handleSubmitComment}
        onClose={() => setComposerOpen(false)}
      />

      <LockedNoticeSheet
        visible={lockedNoticeOpen}
        lockedOutcomeLabel={lockedOutcome?.label ?? null}
        lockedOutcomeColor={lockedOutcomeIndex >= 0 ? resolveOutcomeColor(lockedOutcomeIndex) : Colors.brand}
        lockedStakeKobo={lockedOutcomeId ? myStakeByOutcomeId.get(lockedOutcomeId) ?? null : null}
        attemptedOutcomeLabel={attemptedLabel}
        onAddToLocked={handleAddToLocked}
        onClose={() => setLockedNoticeOpen(false)}
      />
    </SafeAreaView>
  );
}

type MarketBodyProps = {
  market: import('@/hooks/useMarket').MarketDetail;
  outcomes: DetailOutcome[];
  poolExists: boolean;
  isOpen: boolean;
  isLocked: boolean;
  isResolved: boolean;
  isClosed: boolean;
  isBinary: boolean;
  binaryColors: [string, string];
  resolveOutcomeColor: (index: number) => string;
  onPressOutcome: (o: DetailOutcome) => void;
  onPressYes: (o: DetailOutcome, i: number) => void;
  onPressNo: (o: DetailOutcome, i: number) => void;
  yesRef: React.RefObject<View | null>;
  noRef: React.RefObject<View | null>;
  selectedOutcomeId: string | null;
  comments: Comment[];
  commentsLoading: boolean;
  outcomeIndexByLabel: Map<string, number>;
  renderComment: ({ item }: { item: Comment }) => React.ReactElement;
  myStakeByOutcomeId: Map<string, string>;
  lockedOutcomeId: string | null;
};

function MarketBody({
  market,
  outcomes,
  poolExists,
  isOpen,
  isLocked,
  isResolved,
  isClosed,
  isBinary,
  binaryColors,
  resolveOutcomeColor,
  onPressOutcome,
  onPressYes,
  onPressNo,
  yesRef,
  noRef,
  selectedOutcomeId,
  comments,
  commentsLoading,
  renderComment,
  myStakeByOutcomeId,
  lockedOutcomeId,
}: MarketBodyProps) {
  const resolvedWinnerId: string | null = null;

  const leadingIndex = useMemo(() => {
    if (outcomes.length === 0) return 0;
    let best = 0;
    let bestPct = -1;
    outcomes.forEach((o, i) => {
      const p = Math.max(0, o.sharePercent);
      if (p > bestPct) {
        best = i;
        bestPct = p;
      }
    });
    return best;
  }, [outcomes]);

  const leadingOutcome = outcomes[leadingIndex];
  const trailingOutcome = outcomes[1 - leadingIndex] ?? outcomes[0];
  const leadingPct = leadingOutcome?.sharePercent ?? 50;

  const selectedSide: 'leading' | 'trailing' | null = selectedOutcomeId
    ? selectedOutcomeId === leadingOutcome?.id
      ? 'leading'
      : 'trailing'
    : null;

  const panelStateFor = (o: DetailOutcome): PanelState => {
    if (isResolved && resolvedWinnerId) {
      return o.id === resolvedWinnerId ? 'won' : 'lost';
    }
    if (isLocked || isResolved || isClosed) return 'frozen';
    if (lockedOutcomeId && lockedOutcomeId !== o.id) return 'locked';
    if (selectedOutcomeId && selectedOutcomeId === o.id) return 'selected';
    if (selectedOutcomeId && selectedOutcomeId !== o.id) return 'unselected';
    return 'idle';
  };

  const yes = isBinary ? outcomes[0] : null;
  const no = isBinary ? outcomes[1] : null;

  const yesIsMine = yes ? !!myStakeByOutcomeId.get(yes.id) : false;
  const noIsMine = no ? !!myStakeByOutcomeId.get(no.id) : false;

  const Header = (
    <View>
      <View style={styles.heroBlock}>
        <View style={styles.heroRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.question}>{market.question}</Text>
            {market.description ? (
              <Text style={styles.heroSubtext} numberOfLines={2}>
                {market.description}
              </Text>
            ) : null}
          </View>
          {market.imageUrl ? (
            <View style={styles.thumbWrap}>
              <Image
                source={{ uri: market.imageUrl }}
                style={styles.thumb}
                contentFit="cover"
                transition={250}
                accessibilityLabel={`Image for ${market.question}`}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.railWrap}>
          <PulseRail
            leadingPercent={Math.max(0, Math.min(100, leadingPct))}
            leadingLabel={leadingOutcome?.label ?? ''}
            trailingLabel={trailingOutcome?.label ?? ''}
            leadingColor={resolveOutcomeColor(leadingIndex)}
            trailingColor={resolveOutcomeColor(1 - leadingIndex)}
            poolExists={poolExists}
            selectedSide={selectedSide}
            frozen={isClosed}
          />
        </View>
      </View>

      <View style={styles.decisionStage}>
        {isBinary && yes && no ? (
          <View style={styles.binaryRow}>
            <View ref={yesRef} collapsable={false} style={styles.panelHost}>
              <SidePanel
                side={shortTag(yes.label) === 'YES' || shortTag(yes.label) === 'NO' ? (shortTag(yes.label) as 'YES' | 'NO') : 'YES'}
                label={yes.label}
                percent={yes.sharePercent}
                multiplier={yes.multiplier}
                color={binaryColors[0]}
                state={panelStateFor(yes)}
                isMine={yesIsMine}
                poolExists={poolExists}
                isLeading={leadingIndex === 0 && poolExists}
                ctaLabel={yesIsMine ? 'Add to stake' : 'Stake'}
                onPress={() => onPressYes(yes, 0)}
                enterDelay={60}
              />
            </View>
            <View ref={noRef} collapsable={false} style={styles.panelHost}>
              <SidePanel
                side={shortTag(no.label) === 'YES' || shortTag(no.label) === 'NO' ? (shortTag(no.label) as 'YES' | 'NO') : 'NO'}
                label={no.label}
                percent={no.sharePercent}
                multiplier={no.multiplier}
                color={binaryColors[1]}
                state={panelStateFor(no)}
                isMine={noIsMine}
                poolExists={poolExists}
                isLeading={leadingIndex === 1 && poolExists}
                ctaLabel={noIsMine ? 'Add to stake' : 'Stake'}
                onPress={() => onPressNo(no, 1)}
                enterDelay={140}
              />
            </View>
          </View>
        ) : (
          <View style={styles.naryStack}>
            {outcomes.map((o, i) => (
              <OutcomeRow
                key={o.id}
                outcome={o}
                color={resolveOutcomeColor(i)}
                mode={
                  isResolved && resolvedWinnerId
                    ? o.id === resolvedWinnerId
                      ? 'won'
                      : 'lost'
                    : isLocked || isResolved || isClosed
                    ? 'marketLocked'
                    : lockedOutcomeId && lockedOutcomeId !== o.id
                    ? 'otherLocked'
                    : 'open'
                }
                poolExists={poolExists}
                myStakeKobo={myStakeByOutcomeId.get(o.id) ?? null}
                onPress={onPressOutcome}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.statsBlock}>
        <StatsStrip
          totalPoolKobo={market.totalPoolKobo}
          bettorCount={market.bettorCount}
          minStakeKobo={market.minStakeKobo}
        />
      </View>

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
          {isOpen ? 'Drop a take when betting opens' : 'No takes were posted on this market'}
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
  container: { flex: 1, backgroundColor: Colors.surface.base },
  body: { flex: 1 },
  scrollContent: { paddingBottom: rs.size(120) },

  header: {
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs.size(12),
  },
  backBtn: {
    width: rs.size(36),
    height: rs.size(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs.size(18),
  },
  categoryPill: {
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(6),
    backgroundColor: Colors.surface.muted,
    borderRadius: rs.size(999),
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
    letterSpacing: 1.2,
  },

  heroBlock: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(8),
  },
  heroRow: {
    flexDirection: 'row',
    gap: rs.size(14),
    alignItems: 'flex-start',
  },
  heroTextWrap: { flex: 1 },
  question: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(24),
    lineHeight: rs.font(30),
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  heroSubtext: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    lineHeight: rs.font(19),
    color: Colors.text.secondary,
  },
  thumbWrap: {
    width: rs.size(64),
    height: rs.size(64),
    borderRadius: rs.size(14),
    overflow: 'hidden',
    backgroundColor: Colors.surface.muted,
  },
  thumb: { width: '100%', height: '100%' },

  railWrap: {
    marginTop: rs.size(24),
  },

  decisionStage: {
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(20),
  },
  binaryRow: {
    flexDirection: 'row',
    gap: rs.size(12),
  },
  panelHost: { flex: 1 },
  naryStack: {
    gap: rs.size(8),
  },

  statsBlock: {
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(20),
  },

  crowdDivider: {
    marginTop: rs.size(36),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
  },
  crowdLine: { flex: 1, height: 1, backgroundColor: Colors.border.hairline },
  crowdLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
    letterSpacing: 1.5,
  },

  commentSkeletons: { marginTop: rs.size(12) },
  commentSkeleton: {
    height: rs.size(70),
    backgroundColor: Colors.surface.elevated,
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
    color: Colors.text.disabled,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.border.strong,
    textAlign: 'center',
  },
  commentRow: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(20),
    paddingBottom: rs.size(20),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.hairline,
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
    color: Colors.text.primary,
  },
  commentBody: { flex: 1, marginLeft: rs.size(12) },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  commentName: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
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
    color: Colors.border.strong,
  },

  inputBar: {
    backgroundColor: Colors.surface.sunken,
    borderTopWidth: 1,
    borderTopColor: Colors.border.hairline,
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
    color: Colors.text.primary,
  },
  inputPressable: {
    flex: 1,
    backgroundColor: Colors.surface.muted,
    borderRadius: rs.size(20),
    height: rs.size(40),
    paddingHorizontal: rs.size(16),
    justifyContent: 'center',
  },
  inputPlaceholder: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: Colors.text.disabled,
  },

  closedFootnote: {
    backgroundColor: Colors.surface.sunken,
    borderTopWidth: 1,
    borderTopColor: Colors.border.hairline,
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(8),
  },
  closedFootnoteText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
    letterSpacing: 0.3,
  },

  skeletonWrap: { paddingHorizontal: rs.size(20) },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    backgroundColor: Colors.surface.elevated,
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
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
