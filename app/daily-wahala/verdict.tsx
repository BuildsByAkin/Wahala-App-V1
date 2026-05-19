// app/daily-wahala/verdict.tsx
// Daily Wahala — shareable verdict card. (Bundle 6 / v2 Pillar 1.)
//
// A 9:16 portrait card the user can export to camera roll or send via the
// OS share sheet. Renders the question, the user's camp, the verdict, and
// the P&L. We capture the card via react-native-view-shot's `captureRef`
// and route the file URI through expo-sharing / expo-media-library.
//
// Route params:
//   - slug: market slug (required)
//
// The user's bet is resolved client-side from `useMyBets` against the
// market id; we don't yet have a per-market /me/bet endpoint.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { useMyBets } from '@/features/betting';
import { useDailyWahala } from '@/features/daily-wahala';
import { useMarket } from '@/hooks/useMarket';
import { useToast } from '@/hooks/useToast';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { rs } from '@/utils/responsive';

type SearchParams = { slug?: string };

function formatNaira(kobo: string | null | undefined): string {
  return `₦${formatKoboAsNaira(kobo ?? '0')}`;
}

function formatDateLong(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function VerdictScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<SearchParams>();
  const toast = useToast();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  // BACKEND.md §4 — when no slug is passed (deep link from the daily push),
  // fall back to the current Daily Wahala so the verdict card is always
  // about the right market.
  const { data: daily } = useDailyWahala();
  const effectiveSlug = slug ?? daily?.market.slug;
  const { market, outcomes, isLoading } = useMarket(effectiveSlug);
  const { bets } = useMyBets();

  const myBet = useMemo(
    () => (market ? bets.find((b) => b.marketId === market.id) ?? null : null),
    [bets, market]
  );

  const accent = useMemo(
    () => getCategoryAccent(market?.category).primary,
    [market?.category]
  );

  const verdict = useMemo(() => {
    if (!market || !myBet) return null;
    const winningOutcome = outcomes.find((o) => o.id === myBet.outcomeId);
    const status: 'won' | 'lost' | 'pending' =
      market.status === 'resolved'
        ? myBet.status === 'won'
          ? 'won'
          : 'lost'
        : 'pending';
    const payoutKobo = myBet.payoutKobo ?? '0';
    const stakeKobo = myBet.stakeKobo;
    return {
      status,
      outcomeLabel: winningOutcome?.label ?? myBet.outcomeLabel,
      stakeKobo,
      payoutKobo,
    };
  }, [market, myBet, outcomes]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy('share');
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toast.show({
          kind: 'warn',
          title: 'Sharing no dey work for this device.',
        });
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Wahala verdict',
        UTI: 'public.png',
      });
    } catch (err) {
      toast.show({
        kind: 'error',
        title: 'Share no work.',
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }, [toast]);

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy('save');
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (perm.status !== 'granted') {
        toast.show({
          kind: 'warn',
          title: 'Allow Photos access to save.',
        });
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.show({ kind: 'success', title: 'Saved to Photos.' });
    } catch (err) {
      toast.show({
        kind: 'error',
        title: 'Save no work.',
        body: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }, [toast]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!market) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Wahala no dey here.</Text>
          <Text style={styles.emptyBody}>
            We couldn&apos;t find that market. Try again from home.
          </Text>
          <PressableSpring
            variant="primary"
            haptic="tap"
            onPress={() => router.back()}
            style={[styles.primaryBtn, { backgroundColor: Colors.brand }]}
            accessibilityLabel="Go back"
          >
            <Text style={styles.primaryBtnLabel}>Back</Text>
          </PressableSpring>
        </View>
      </SafeAreaView>
    );
  }

  const statusKicker = verdict
    ? verdict.status === 'won'
      ? 'WAHALA WIN'
      : verdict.status === 'lost'
        ? 'WAHALA L'
        : 'WAHALA PENDING'
    : 'NO STANCE';
  const statusColor = verdict
    ? verdict.status === 'won'
      ? Colors.status.win
      : verdict.status === 'lost'
        ? Colors.status.loss
        : accent
    : Colors.text.tertiary;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <PressableSpring
          variant="ghost"
          haptic="tap"
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close"
          style={styles.topBtn}
        >
          <Feather name="x" size={rs.size(22)} color={Colors.text.primary} />
        </PressableSpring>
        <Text style={styles.topTitle}>Verdict card</Text>
        <View style={styles.topBtn} />
      </View>

      {/* Centered 9:16 card */}
      <View style={styles.cardWrap}>
        <View
          ref={cardRef}
          collapsable={false}
          style={[
            styles.card,
            { backgroundColor: '#0E0E0E', borderColor: `${accent}66` },
          ]}
          accessibilityLabel="Daily Wahala verdict card"
        >
          {market.imageUrl ? (
            <Image
              source={{ uri: market.imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={0}
            />
          ) : null}
          <View style={[styles.cardGradient, { backgroundColor: `${accent}22` }]} />

          <View style={styles.cardInner}>
            <View style={styles.cardTopRow}>
              <Text style={[styles.cardKicker, { color: accent }]}>⚡ TODAY&apos;S WAHALA</Text>
              <Text style={styles.cardDate}>{formatDateLong(market.closesAt)}</Text>
            </View>

            <Text style={styles.cardQuestion} numberOfLines={5}>
              {market.question}
            </Text>

            <View style={styles.spacer} />

            <View style={styles.verdictBlock}>
              <Text style={[styles.verdictKicker, { color: statusColor }]}>
                {statusKicker}
              </Text>
              {verdict ? (
                <>
                  <Text style={styles.verdictCamp} numberOfLines={2}>
                    My camp: <Text style={{ color: accent }}>{verdict.outcomeLabel}</Text>
                  </Text>
                  <View style={styles.amountRow}>
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>STAKE</Text>
                      <Text style={styles.amountValue}>{formatNaira(verdict.stakeKobo)}</Text>
                    </View>
                    <View style={styles.amountDivider} />
                    <View style={styles.amountCol}>
                      <Text style={styles.amountLabel}>
                        {verdict.status === 'won' ? 'PAYOUT' : verdict.status === 'lost' ? 'LOSS' : 'POTENTIAL'}
                      </Text>
                      <Text
                        style={[
                          styles.amountValue,
                          {
                            color:
                              verdict.status === 'won'
                                ? Colors.status.win
                                : verdict.status === 'lost'
                                  ? Colors.status.loss
                                  : Colors.text.primary,
                          },
                        ]}
                      >
                        {verdict.status === 'lost'
                          ? `-${formatNaira(verdict.stakeKobo)}`
                          : formatNaira(verdict.payoutKobo)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.verdictCamp}>
                  No stance for this Wahala — next one go better.
                </Text>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardBrand}>Wahala</Text>
              <Text style={styles.cardFooterCopy}>Pick a camp. See the gist.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action row */}
      <View style={styles.actions}>
        <PressableSpring
          variant="secondary"
          haptic="tap"
          onPress={handleSave}
          disabled={busy !== null}
          style={[styles.secondaryBtn, busy === 'save' && styles.btnBusy]}
          accessibilityLabel="Save verdict to Photos"
        >
          {busy === 'save' ? (
            <ActivityIndicator color={Colors.text.primary} />
          ) : (
            <>
              <Feather name="download" size={rs.size(18)} color={Colors.text.primary} />
              <Text style={styles.secondaryBtnLabel}>Save</Text>
            </>
          )}
        </PressableSpring>

        <PressableSpring
          variant="primary"
          haptic="medium"
          onPress={handleShare}
          disabled={busy !== null}
          style={[styles.primaryBtn, { backgroundColor: Colors.brand }, busy === 'share' && styles.btnBusy]}
          accessibilityLabel="Share verdict"
        >
          {busy === 'share' ? (
            <ActivityIndicator color={Colors.text.onAction} />
          ) : (
            <>
              <Feather name="share-2" size={rs.size(18)} color={Colors.text.onAction} />
              <Text style={styles.primaryBtnLabel}>Share verdict</Text>
            </>
          )}
        </PressableSpring>
      </View>
    </SafeAreaView>
  );
}

const CARD_WIDTH = rs.wp(82);
const CARD_HEIGHT = (CARD_WIDTH * 16) / 9;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface['00'],
  },
  topBar: {
    height: rs.size(48),
    paddingHorizontal: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBtn: {
    width: rs.size(40),
    height: rs.size(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
  },
  cardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs.size(16),
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: rs.size(24),
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInner: {
    flex: 1,
    padding: rs.size(20),
    justifyContent: 'flex-start',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardKicker: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.4,
  },
  cardDate: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
  },
  cardQuestion: {
    marginTop: rs.size(16),
    fontFamily: Fonts.bold,
    fontSize: rs.font(26),
    color: Colors.text.primary,
    letterSpacing: -0.4,
    lineHeight: rs.font(32),
  },
  spacer: {
    flex: 1,
  },
  verdictBlock: {
    gap: rs.size(10),
  },
  verdictKicker: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 1.5,
  },
  verdictCamp: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(16),
    color: Colors.text.primary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: rs.size(8),
    backgroundColor: '#00000066',
    borderRadius: rs.size(14),
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(14),
    gap: rs.size(12),
  },
  amountCol: {
    flex: 1,
    gap: rs.size(4),
  },
  amountDivider: {
    width: 1,
    backgroundColor: Colors.border.s02,
  },
  amountLabel: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 1.2,
  },
  amountValue: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    marginTop: rs.size(20),
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardBrand: {
    fontFamily: Fonts.display,
    fontSize: rs.font(28),
    color: Colors.brand,
  },
  cardFooterCopy: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: rs.size(10),
    paddingHorizontal: rs.size(16),
    paddingTop: rs.size(12),
    paddingBottom: rs.size(20),
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
    flexBasis: rs.size(110),
    height: rs.size(52),
    borderRadius: rs.size(16),
    backgroundColor: Colors.surface['02'],
    borderWidth: 1,
    borderColor: Colors.border.s02,
  },
  secondaryBtnLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(8),
    height: rs.size(52),
    borderRadius: rs.size(16),
  },
  primaryBtnLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.onAction,
    letterSpacing: 0.2,
  },
  btnBusy: {
    opacity: 0.8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs.size(24),
    gap: rs.size(12),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
  },
  emptyBody: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
