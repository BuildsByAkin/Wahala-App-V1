import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  useActivityFeed,
  useCampRoster,
} from '@/features/markets';
import { useMarketStream } from '@/features/realtime/hooks/use-market-stream';
import { useRoomState } from '@/features/audio-room';
import { useCampChat } from '@/features/camp-chat/hooks/use-camp-chat';
import { useSendCampChat } from '@/features/camp-chat/hooks/use-send-camp-chat';
import { useSendReaction } from '@/features/reactions/hooks/use-send-reaction';
import {
  ReactionConfetti,
  type ReactionConfettiHandle,
} from '@/components/market/ReactionConfetti';
import { useComments, type Comment } from '@/hooks/useComments';
import { useToggleLike } from '@/hooks/useToggleLike';
import { useCreateComment } from '@/hooks/useCreateComment';
import { OutcomeRow } from '@/components/market/outcome-row';
import { StatsStrip } from '@/components/market/stats-strip';
import { StatusPill } from '@/components/market/status-pill';
import { PulseRail } from '@/components/market/pulse-rail';
import { type PanelState } from '@/components/market/side-panel';
import { CampSplitHeader, type CampPanelState } from '@/components/market/CampSplitHeader';
import { ActivityTape, type ActivityEntry } from '@/components/market/ActivityTape';
import { DramaMode } from '@/components/market/DramaMode';
import { LiveAudioRoom } from '@/components/market/LiveAudioRoom';
import { Resolution } from '@/components/market/Resolution';
import { CampRoster, type RosterMember } from '@/components/market/CampRoster';
import { CommentRow } from '@/components/market/CommentRow';
import { CommentComposer } from '@/components/market/CommentComposer';
import { Gist, type GistTab } from '@/components/market/Gist';
import { SheetBase } from '@/components/motion/SheetBase';
import { useDramaMode } from '@/hooks/useDramaMode';
import {
  formatPoolKobo,
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
  useSwitchOutcome,
} from '@/features/betting';
import { StanceChangeEvent } from '@/components/market/StanceChangeEvent';

const PULSE_YES = '#14B8A6';
const PULSE_NO = '#6366F1';

function isYesLabel(label: string | null | undefined) {
  if (typeof label !== 'string') return false;
  return /^y(es)?$/i.test(label.trim());
}
function isNoLabel(label: string | null | undefined) {
  if (typeof label !== 'string') return false;
  return /^n(o)?$/i.test(label.trim());
}

function shortTag(label: string | null | undefined): string {
  if (typeof label !== 'string') return '';
  const trimmed = label.trim();
  if (isYesLabel(trimmed)) return 'YES';
  if (isNoLabel(trimmed)) return 'NO';
  return trimmed.slice(0, 3).toUpperCase();
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

  // BACKEND.md §3 — open the SSE stream while the screen is mounted so the
  // motion library (TickFlash, RailBreathe, ActivityTape) animates from
  // real cache diffs instead of waiting for the next refetch interval.
  // The reaction confetti layer is mounted further down — push inbound
  // reaction events to it via the imperative `fire(emoji)` handle.
  const confettiRef = useRef<ReactionConfettiHandle | null>(null);
  useMarketStream(slug, market?.id, {
    onReaction: (evt) => confettiRef.current?.fire(evt.emoji),
  });

  // BACKEND.md §9 — outbound reactions throttled client-side at 5/sec.
  const { send: sendReaction } = useSendReaction(market?.id);

  // BACKEND.md §8 — real activity tape. Replaces the synthesized stand-in
  // that used to live inside MarketBody.
  const activityFeed = useActivityFeed(slug);
  const activityEvents = useMemo(
    () => activityFeed.data?.pages.flatMap((p) => p.events) ?? [],
    [activityFeed.data]
  );

  // BACKEND.md §12 — read-only room state. Audio band only renders when the
  // server says a room is active.
  const { data: roomState } = useRoomState(market?.id);

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
    const a = outcomes[0];
    const b = outcomes[1];
    if (a && isYesLabel(a.label)) return [PULSE_YES, PULSE_NO];
    if (b && isYesLabel(b.label)) return [PULSE_NO, PULSE_YES];
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
  const [attemptedOutcomeId, setAttemptedOutcomeId] = useState<string | null>(null);

  const attemptedOutcome = useMemo(
    () =>
      attemptedOutcomeId
        ? outcomes.find((o) => o.id === attemptedOutcomeId) ?? null
        : null,
    [attemptedOutcomeId, outcomes]
  );
  const attemptedOutcomeIndex = useMemo(
    () =>
      attemptedOutcomeId
        ? outcomes.findIndex((o) => o.id === attemptedOutcomeId)
        : -1,
    [attemptedOutcomeId, outcomes]
  );
  const attemptedLabel = attemptedOutcome?.label ?? null;
  const attemptedColor =
    attemptedOutcomeIndex >= 0
      ? resolveOutcomeColor(attemptedOutcomeIndex)
      : Colors.brand;

  // BACKEND.md §7 — switch the user's active stake on the locked outcome to
  // the attempted outcome. We resolve the betId lazily at click time so a
  // brand-new bet placed seconds before is included.
  const switchMutation = useSwitchOutcome({ marketSlug: slug });
  const switchFeeLabel = switchMutation.feeKobo
    ? `₦${formatPoolKobo(switchMutation.feeKobo)}`
    : null;

  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const toggleLikeMutation = useToggleLike(market?.id);

  const createCommentMutation = useCreateComment(market?.id);

  const [activeTab, setActiveTab] = useState<GistTab>('public');
  // Auto-snap back to public if the user defects out of their camp (locked
  // outcome cleared) so they don't get stuck on an empty tab.
  useEffect(() => {
    if (activeTab === 'camp' && !lockedOutcomeId) setActiveTab('public');
  }, [activeTab, lockedOutcomeId]);

  // BACKEND.md §6 — camp-only chat. We only fetch when the user has a
  // stance AND the camp tab is selected; the hook bails internally
  // otherwise via `enabled`.
  const inCampMode = activeTab === 'camp' && !!lockedOutcomeId;
  const campChatQuery = useCampChat(
    inCampMode ? market?.id : undefined,
    inCampMode ? (lockedOutcomeId ?? undefined) : undefined
  );
  const sendCampChatMutation = useSendCampChat();

  // Adapter — camp messages render through the existing CommentRow path so
  // we don't have to fork the FlashList. Likes/replies/bet-pill are nulled
  // out because camp chat has no such affordances.
  const campComments = useMemo<Comment[]>(() => {
    if (!inCampMode) return [];
    const pages = campChatQuery.data?.pages ?? [];
    const flat = pages.flatMap((p) => p.messages);
    const lockedLabel =
      outcomes.find((o) => o.id === lockedOutcomeId)?.label ?? null;
    return flat
      .filter((m) => !m.isDeleted && m.moderationStatus === 'visible')
      .map<Comment>((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        author: {
          userId: m.author.userId,
          username: m.author.username,
          displayName: m.author.displayName,
          role: 'user',
        },
        bet: lockedLabel ? { outcomeLabel: lockedLabel } : null,
        likeCount: 0,
        replyCount: 0,
        hasLiked: false,
        isOwn: m.author.userId === userId,
        isDeleted: false,
        moderationStatus: 'visible',
      }));
  }, [
    inCampMode,
    campChatQuery.data,
    outcomes,
    lockedOutcomeId,
    userId,
  ]);

  const visibleComments = inCampMode ? campComments : comments;
  const visibleCommentsLoading = inCampMode
    ? campChatQuery.isLoading
    : commentsLoading;
  const [rosterSide, setRosterSide] = useState<'leading' | 'trailing' | null>(null);
  const [resolutionDismissed, setResolutionDismissed] = useState(false);

  const yesRef = useRef<View>(null);
  const noRef = useRef<View>(null);

  const { isDrama, secondsLeft } = useDramaMode(market?.closesAt, market?.status);
  const dramaGlow = useMemo(() => {
    if (isBinary) return binaryColors[0];
    return Colors.brand;
  }, [isBinary, binaryColors]);

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
        setAttemptedOutcomeId(outcome.id);
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

  const handleSwitchToAttempted = useCallback(() => {
    if (!market || !lockedOutcomeId || !attemptedOutcomeId) return;
    // Pick the most recent active bet on the locked outcome — server
    // applies the switch to that lineage and the cascade handles the rest.
    const candidateBet = myActiveBets
      .filter(
        (b) => b.marketId === market.id && b.outcomeId === lockedOutcomeId
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    if (!candidateBet) {
      Alert.alert(
        'No active stake',
        'We could not find an active stake to switch.'
      );
      return;
    }
    switchMutation
      .switchOutcome({
        betId: candidateBet.id,
        targetOutcomeId: attemptedOutcomeId,
        marketId: market.id,
        previousOutcomeId: lockedOutcomeId,
      })
      .then(() => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
        setLockedNoticeOpen(false);
        setAttemptedOutcomeId(null);
      })
      .catch((err) => {
        const e = err as { code?: string; message?: string };
        const title =
          e.code === 'market_closed'
            ? 'Market closed'
            : e.code === 'invalid_target'
            ? 'Cannot switch'
            : e.code === 'unauthorized'
            ? 'Sign in required'
            : 'Switch failed';
        Alert.alert(title, e.message ?? 'Something went wrong.');
      });
  }, [
    market,
    lockedOutcomeId,
    attemptedOutcomeId,
    myActiveBets,
    switchMutation,
  ]);

  const hasActivePosition = myStakeByOutcomeId.size > 0;
  const composerEnabled = isOpen && hasActivePosition;

  const handleSubmitComment = (body: string) => {
    if (!market) return;
    if (inCampMode && lockedOutcomeId) {
      sendCampChatMutation.mutate(
        { marketId: market.id, outcomeId: lockedOutcomeId, body },
        {
          onError: (err) => {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Could not send to your camp. Try again.';
            Alert.alert('Camp chat failed', message);
          },
        }
      );
      return;
    }
    createCommentMutation.mutate(
      { body },
      {
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

  // Camp / outcome lookup for the inline composer's stance pill.
  const myOutcomeIndex = useMemo(
    () => (lockedOutcomeId ? outcomes.findIndex((o) => o.id === lockedOutcomeId) : -1),
    [lockedOutcomeId, outcomes]
  );
  const myOutcomeColor =
    myOutcomeIndex >= 0 ? resolveOutcomeColor(myOutcomeIndex) : Colors.brand;
  const myOutcomeLabel = myOutcomeIndex >= 0 ? outcomes[myOutcomeIndex]?.label ?? null : null;

  // Roster sheet — real members come from BACKEND.md §5.2. We only fetch
  // when the sheet is open (the hook is gated by both slug + outcomeId).
  const rosterOutcome = useMemo<DetailOutcome | null>(() => {
    if (!rosterSide) return null;
    if (!isBinary) return null;
    return rosterSide === 'leading' ? outcomes[0] ?? null : outcomes[1] ?? null;
  }, [rosterSide, isBinary, outcomes]);

  const rosterQuery = useCampRoster(
    rosterOutcome ? slug : undefined,
    rosterOutcome?.id,
    { sort: 'stake' }
  );

  const rosterMembers = useMemo<RosterMember[]>(() => {
    const real = rosterQuery.data?.members ?? [];
    return real.map((m) => ({
      id: m.userId,
      initial: getInitial(m.displayName, m.username),
      name: m.displayName ?? m.username,
      stakeKobo: m.stakeKobo,
      isYou: m.userId === userId,
    }));
  }, [rosterQuery.data, userId]);

  // Resolution overlay — server now exposes `resolvedOutcomeId` (BACKEND.md
  // §16). When the user's locked outcome matches we render the win variant
  // with the *actual* payout from /me/bets; otherwise render the loss
  // variant against their original stake.
  const showResolution = isResolved && !resolutionDismissed && hasActivePosition;
  const resolutionVariant = useMemo(() => {
    const winnerId = market?.resolvedOutcomeId ?? null;
    const userIsWinner = !!winnerId && !!lockedOutcomeId && winnerId === lockedOutcomeId;
    if (userIsWinner) {
      // Real payout — sum of every /me/bets entry on the winning outcome.
      const myWin = myActiveBets
        .filter((b) => b.marketId === market?.id && b.outcomeId === winnerId)
        .reduce((acc, b) => acc + (b.payoutKobo ? BigInt(b.payoutKobo) : 0n), 0n)
        .toString();
      return {
        kind: 'win' as const,
        campColor: myOutcomeColor,
        payoutLabel: `+${formatPoolKobo(myWin)}`,
      };
    }
    const stake = lockedOutcomeId ? myStakeByOutcomeId.get(lockedOutcomeId) ?? '0' : '0';
    return { kind: 'loss' as const, stakeLabel: formatPoolKobo(stake) };
  }, [
    market?.resolvedOutcomeId,
    market?.id,
    lockedOutcomeId,
    myStakeByOutcomeId,
    myOutcomeColor,
    myActiveBets,
  ]);

  // Live audio room — speakers come from /markets/:id/room. We only render
  // the band when the server reports the room is active (and we're in
  // Drama Mode), so this hook safely returns empty otherwise.
  const liveSpeakers = useMemo(() => {
    if (!roomState?.speakers) return [];
    return roomState.speakers.map((s, i) => ({
      id: s.userId,
      initial: getInitial(s.displayName, s.userId),
      color: s.avatarColor ?? binaryColors[i % 2] ?? Colors.brand,
      speaking: !s.isMuted,
    }));
  }, [roomState?.speakers, binaryColors]);

  const isRoomActive = roomState?.isActive ?? false;
  const liveListenerCount = roomState?.listenerCount ?? 0;

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
        {market && market.category ? (
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
          <ErrorBoundary label="MarketBody">
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
            comments={visibleComments}
            commentsLoading={visibleCommentsLoading}
            outcomeIndexByLabel={outcomeIndexByLabel}
            renderComment={renderComment}
            myStakeByOutcomeId={myStakeByOutcomeId}
            lockedOutcomeId={lockedOutcomeId}
            isDrama={isDrama}
            dramaSecondsLeft={secondsLeft}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            hasStance={hasActivePosition}
            myCampLabel={myOutcomeLabel}
            myCampColor={myOutcomeColor}
            onOpenRoster={(side) => setRosterSide(side)}
            activityEvents={activityEvents}
          />
          </ErrorBoundary>
        )}

        {isDrama ? (
          <View pointerEvents="auto" style={styles.dramaOverlay}>
            <DramaMode
              active
              secondsLeft={secondsLeft}
              glowColor={dramaGlow}
              audioRoomSlot={
                isRoomActive ? (
                  <LiveAudioRoom
                    active
                    listenerCount={liveListenerCount}
                    speakers={liveSpeakers}
                    tint={dramaGlow}
                  />
                ) : null
              }
            />
          </View>
        ) : null}

        {isOpen ? (
          <View style={{ paddingBottom: insets.bottom }}>
            {/* BACKEND.md §10 — emoji confetti. Inbound events fire via
                useMarketStream onReaction; outbound goes through sendReaction. */}
            <ReactionConfetti
              ref={confettiRef}
              tint={myOutcomeColor}
              onUserReact={(e) => sendReaction(e as never)}
            />
            <CommentComposer
              avatarColor={myAvatarColor}
              avatarInitial={myInitial}
              outcomeLabel={myOutcomeLabel}
              outcomeColor={myOutcomeColor}
              isSubmitting={
                activeTab === 'camp' && lockedOutcomeId
                  ? sendCampChatMutation.isPending
                  : createCommentMutation.isPending
              }
              onSubmit={handleSubmitComment}
              disabledReason={
                composerEnabled ? null : 'Stake first to join the gist'
              }
            />
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

      <SheetBase visible={!!rosterSide} onClose={() => setRosterSide(null)}>
        {rosterOutcome ? (
          <CampRoster
            campLabel={shortTag(rosterOutcome.label)}
            campColor={
              rosterSide === 'leading' ? binaryColors[0] : binaryColors[1]
            }
            members={rosterMembers}
          />
        ) : null}
      </SheetBase>

      <Resolution
        visible={showResolution}
        variant={resolutionVariant}
        onDismiss={() => setResolutionDismissed(true)}
      />

      <LockedNoticeSheet
        visible={lockedNoticeOpen}
        lockedOutcomeLabel={lockedOutcome?.label ?? null}
        lockedOutcomeColor={lockedOutcomeIndex >= 0 ? resolveOutcomeColor(lockedOutcomeIndex) : Colors.brand}
        lockedStakeKobo={lockedOutcomeId ? myStakeByOutcomeId.get(lockedOutcomeId) ?? null : null}
        attemptedOutcomeLabel={attemptedLabel}
        attemptedOutcomeColor={attemptedColor}
        canSwitch={!!attemptedOutcomeId && !!lockedOutcomeId && isOpen}
        isSwitching={switchMutation.isSwitching}
        switchFeeLabel={switchFeeLabel}
        onSwitchToAttempted={handleSwitchToAttempted}
        onAddToLocked={handleAddToLocked}
        onClose={() => {
          setLockedNoticeOpen(false);
          setAttemptedOutcomeId(null);
        }}
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
  isDrama: boolean;
  dramaSecondsLeft: number;
  activeTab: GistTab;
  onChangeTab: (t: GistTab) => void;
  hasStance: boolean;
  myCampLabel: string | null;
  myCampColor: string;
  onOpenRoster: (side: 'leading' | 'trailing') => void;
  activityEvents: import('@/features/markets/api/activity-api').ActivityEvent[];
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
  isDrama: _isDrama,
  dramaSecondsLeft: _dramaSecondsLeft,
  activeTab,
  onChangeTab,
  hasStance,
  myCampLabel,
  myCampColor,
  onOpenRoster,
  activityEvents,
}: MarketBodyProps) {
  const resolvedWinnerId: string | null = market.resolvedOutcomeId ?? null;

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

  // Ripple state — detect a change in `myStakeByOutcomeId` (a stake landed),
  // bump the trigger, and remember which side it hit.
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const [rippleSide, setRippleSide] = useState<'leading' | 'trailing' | null>(null);
  const prevStakesRef = useRef<Map<string, string>>(myStakeByOutcomeId);
  useEffect(() => {
    const prev = prevStakesRef.current;
    let changedOutcomeId: string | null = null;
    for (const [k, v] of myStakeByOutcomeId.entries()) {
      if (prev.get(k) !== v) {
        changedOutcomeId = k;
        break;
      }
    }
    prevStakesRef.current = myStakeByOutcomeId;
    if (!changedOutcomeId) return;
    setRippleSide(changedOutcomeId === leadingOutcome?.id ? 'leading' : 'trailing');
    setRippleTrigger((n) => n + 1);
  }, [myStakeByOutcomeId, leadingOutcome?.id]);

  // BACKEND.md §8 — real activity tape. Stake + stance_change events are the
  // only ones we surface in the ticker (milestone + resolution render
  // elsewhere). New events arrive via SSE and are spliced by useMarketStream.
  const activityEntries: ActivityEntry[] = useMemo(() => {
    const out: ActivityEntry[] = [];
    for (let i = 0; i < activityEvents.length && out.length < 12; i++) {
      const evt = activityEvents[i];
      if (evt.type === 'stake') {
        const idx = outcomes.findIndex((x) => x.id === evt.outcomeId);
        if (idx < 0) continue;
        const label = evt.outcomeLabel ?? outcomes[idx]?.label ?? '';
        if (!label) continue;
        out.push({
          id: evt.id ?? `${evt.createdAt}-${evt.userId}-stake`,
          who: evt.displayName ?? 'Anonymous',
          color: resolveOutcomeColor(idx),
          amount: `₦${formatPoolKobo(evt.stakeKobo)}`,
          side: label.toUpperCase(),
          ago: timeAgo(evt.createdAt),
        });
      }
      // stance_change events intentionally suppressed — the switch-camp
      // feature was removed (one side per market, no hedging). Old events
      // may still arrive from the server; we ignore them in the tape and
      // in the dramatic defection card list below.
    }
    return out;
  }, [activityEvents, outcomes, resolveOutcomeColor]);

  // BACKEND.md §7 — render the most recent 3 defection events as a dramatic
  // gradient card before the comments list. Falls back gracefully when an
  // outcome id is no longer in the market (shouldn't happen post-resolution).
  const stanceChanges = useMemo(() => {
    type Entry = {
      id: string;
      who: string;
      fromLabel: string;
      toLabel: string;
      fromColor: string;
      toColor: string;
      ago: string;
    };
    // Switch-camp / defection cards are disabled — feature removed
    // (one side per market). Early-return an empty list so the JSX
    // call sites and types stay identical and we don't ripple changes.
    const ENABLED = false;
    if (!ENABLED) return [] as Entry[];
    const out: Entry[] = [];
    for (let i = 0; i < activityEvents.length && out.length < 3; i++) {
      const evt = activityEvents[i];
      if (evt.type !== 'stance_change') continue;
      const fromIdx = outcomes.findIndex((o) => o.id === evt.fromOutcomeId);
      const toIdx = outcomes.findIndex((o) => o.id === evt.toOutcomeId);
      const fromLabel =
        evt.fromOutcomeLabel ??
        evt.fromLabel ??
        (fromIdx >= 0 ? outcomes[fromIdx]?.label : undefined) ??
        '';
      const toLabel =
        evt.toOutcomeLabel ??
        evt.toLabel ??
        (toIdx >= 0 ? outcomes[toIdx]?.label : undefined) ??
        '';
      if (!fromLabel || !toLabel) continue;
      out.push({
        id: evt.id ?? `${evt.createdAt}-${evt.userId}-switch-card`,
        who: evt.displayName ?? 'Someone',
        fromLabel,
        toLabel,
        fromColor: fromIdx >= 0 ? resolveOutcomeColor(fromIdx) : Colors.text.tertiary,
        toColor: toIdx >= 0 ? resolveOutcomeColor(toIdx) : Colors.brand,
        ago: timeAgo(evt.createdAt),
      });
    }
    return out;
  }, [activityEvents, outcomes, resolveOutcomeColor]);

  const campStateFor = (o: DetailOutcome): CampPanelState => {
    if (isResolved && resolvedWinnerId) {
      return o.id === resolvedWinnerId ? 'won' : 'lost';
    }
    if (isLocked || isResolved || isClosed) return 'frozen';
    if (lockedOutcomeId && lockedOutcomeId !== o.id) return 'locked';
    if (myStakeByOutcomeId.get(o.id)) return 'selected';
    return 'idle';
  };

  const synthAvatars = (id: string, n: number) => {
    const inits = ['A', 'C', 'I', 'O', 'S', 'M', 'D'];
    const arr = [];
    for (let i = 0; i < Math.min(4, Math.max(0, n)); i++) {
      arr.push({ id: `${id}-a-${i}`, initial: inits[i % inits.length] });
    }
    return arr;
  };

  const Header = (
    <View>
      <View style={styles.heroBlock}>
        <View style={styles.heroRow}>
          <View style={styles.heroTextWrap}>
            {market.description ? (
              <>
                <Text style={styles.heroLead}>{market.description}</Text>
                <Text style={styles.heroQuestion}>{market.question}</Text>
              </>
            ) : (
              <Text style={styles.heroLead}>{market.question}</Text>
            )}
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
            rippleTrigger={rippleTrigger}
            rippleSide={rippleSide}
          />
        </View>
      </View>

      <ErrorBoundary label="MyStakeBanner">
        {lockedOutcomeId ? (() => {
          const myIdx = outcomes.findIndex((o) => o.id === lockedOutcomeId);
          if (myIdx < 0) return null;
          const myOutcome = outcomes[myIdx];
          const myColor = resolveOutcomeColor(myIdx);
          const myStake = myStakeByOutcomeId.get(lockedOutcomeId) ?? null;
          return (
            <View style={styles.myStakeBannerWrap}>
              <View
                style={[
                  styles.myStakeBanner,
                  { backgroundColor: `${myColor}14`, borderColor: `${myColor}40` },
                ]}
              >
                <View style={[styles.myStakeDot, { backgroundColor: myColor }]} />
                <View style={styles.myStakeTextWrap}>
                  <Text style={styles.myStakeLabel}>YOUR POSITION</Text>
                  <Text style={styles.myStakeValue} numberOfLines={1}>
                    Staked{' '}
                    <Text style={[styles.myStakeStrong, { color: myColor }]}>
                      {shortTag(myOutcome?.label ?? '')}
                    </Text>
                    {myStake ? (
                      <Text style={styles.myStakeValue}>
                        {' · '}
                        <Text style={styles.myStakeStrong}>{formatPoolKobo(myStake)}</Text>
                      </Text>
                    ) : null}
                  </Text>
                </View>
              </View>
            </View>
          );
        })() : null}
      </ErrorBoundary>

      <ErrorBoundary label="ActivityTape">
        {activityEntries.length > 0 ? (
          <View style={styles.tapeWrap}>
            <ActivityTape entries={activityEntries} />
          </View>
        ) : null}
      </ErrorBoundary>

      <View style={isBinary ? styles.decisionStageBinary : styles.decisionStage}>
        {isBinary && yes && no ? (
          <CampSplitHeader
            leadingRef={yesRef}
            trailingRef={noRef}
            leading={{
              label: shortTag(yes.label),
              longLabel: yes.label,
              multiplier: yes.multiplier,
              bettorCount: yes.bettorCount,
              totalStakedKobo: yes.totalPoolKobo,
              sharePercent: yes.sharePercent,
              color: binaryColors[0],
              state: campStateFor(yes),
              avatars: synthAvatars(yes.id, yes.bettorCount),
              onPress: () => onPressYes(yes, 0),
              onLongPress: () => onOpenRoster('leading'),
            }}
            trailing={{
              label: shortTag(no.label),
              longLabel: no.label,
              multiplier: no.multiplier,
              bettorCount: no.bettorCount,
              totalStakedKobo: no.totalPoolKobo,
              sharePercent: no.sharePercent,
              color: binaryColors[1],
              state: campStateFor(no),
              avatars: synthAvatars(no.id, no.bettorCount),
              onPress: () => onPressNo(no, 1),
              onLongPress: () => onOpenRoster('trailing'),
            }}
          />
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
          lateFeePoolKobo={market.lateFeePoolKobo}
        />
      </View>

      <View style={styles.crowdDivider}>
        <View style={styles.crowdLine} />
        <Text style={styles.crowdLabel}>THE GIST</Text>
        <View style={styles.crowdLine} />
      </View>

      <View style={styles.gistWrap}>
        <Gist
          activeTab={activeTab}
          onChangeTab={onChangeTab}
          hasStance={hasStance}
          campLabel={myCampLabel}
          campColor={myCampColor}
        />
      </View>

      {/* BACKEND.md §7 — surface the most recent defections as their own
          dramatic card before the comments list, capped at 3. */}
      <ErrorBoundary label="StanceChanges">
        {stanceChanges.length > 0 ? (
          <View>
            {stanceChanges.map((s) => (
              <ErrorBoundary key={s.id} label={`StanceChangeEvent:${s.id}`}>
                <StanceChangeEvent
                  who={s.who}
                  fromLabel={s.fromLabel}
                  toLabel={s.toLabel}
                  fromColor={s.fromColor}
                  toColor={s.toColor}
                  ago={s.ago}
                />
              </ErrorBoundary>
            ))}
          </View>
        ) : null}
      </ErrorBoundary>

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
  heroLead: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    lineHeight: rs.font(29),
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  heroQuestion: {
    marginTop: rs.size(10),
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    lineHeight: rs.font(18),
    color: Colors.text.tertiary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
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
  decisionStageBinary: {
    marginTop: rs.size(20),
  },
  tapeWrap: {
    marginTop: rs.size(16),
  },
  myStakeBannerWrap: {
    marginTop: rs.size(16),
    paddingHorizontal: rs.size(20),
  },
  myStakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(12),
    borderRadius: rs.size(14),
    borderWidth: 1,
  },
  myStakeDot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
  },
  myStakeTextWrap: { flex: 1 },
  myStakeLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 1.2,
  },
  myStakeValue: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
  },
  myStakeStrong: {
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  dramaOverlay: {
    ...StyleSheet.absoluteFillObject,
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
  gistWrap: { marginTop: rs.size(14) },
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
