// components/home/MarketCardFull.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import {
  type Market,
  type Outcome,
  formatClosesIn,
  formatPoolKobo,
  getCardSchemeColors,
  getOutcomeMultiplier,
  getOutcomePercent,
  hasPool,
  isClosingSoon,
} from '@/utils/market';

export type MarketCardCtaVariant = 'stake' | 'view';

interface MarketCardFullProps {
  market: Market;
  ctaVariant?: MarketCardCtaVariant;
}

type RankedOutcome = {
  outcome: Outcome;
  stake: bigint;
};

function rankOutcomes(outcomes: Outcome[]): RankedOutcome[] {
  return outcomes
    .map((outcome) => {
      let stake = 0n;
      try {
        stake = BigInt(outcome.totalStakedKobo);
      } catch {
        stake = 0n;
      }
      return { outcome, stake };
    })
    .sort((a, b) => (b.stake > a.stake ? 1 : b.stake < a.stake ? -1 : 0));
}

export const MarketCardFull: React.FC<MarketCardFullProps> = ({
  market,
  ctaVariant = 'view',
}) => {
  const poolExists = hasPool(market.totalPoolKobo);
  const closesLabel = formatClosesIn(market.closesAt);
  const isSoon = isClosingSoon(market.closesAt);
  const isBinary = market.outcomes.length <= 2;
  const scheme = getCardSchemeColors(market.id);

  const ranked = rankOutcomes(market.outcomes);
  const visible = ranked.slice(0, 2);
  const hiddenCount = Math.max(0, ranked.length - 2);

  const leader = visible[0];
  const trailer = visible[1];
  const equalSplit = !poolExists || !leader || !trailer || leader.stake === trailer.stake;

  return (
    <View style={styles.container}>
      {/* 1. Meta row — category + closes-in */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.category}>{market.category.toUpperCase()}</Text>
          {market.featured && <Text style={styles.trending}>· TRENDING</Text>}
        </View>
        <View style={styles.closesIn}>
          <Feather name="clock" size={rs.font(11)} color={isSoon ? '#FF6500' : '#5A5A5A'} />
          <Text style={[styles.closesText, isSoon && styles.closesTextUrgent]}>
            {closesLabel}
          </Text>
        </View>
      </View>

      {/* 2. Question — the dominant element */}
      <View style={styles.questionRow}>
        <Text style={styles.question}>{market.question}</Text>
        {market.imageUrl ? (
          <Image
            source={{ uri: market.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityLabel={`Image for ${market.question}`}
          />
        ) : null}
      </View>

      {/* 3. Outcome block — leader (~70%) + trailer (~30%) */}
      {visible.length > 0 && (
        <View style={styles.outcomesWrap}>
          <View style={styles.outcomes}>
            {visible.map((entry, index) => {
              const accent = isBinary
                ? (scheme[index] ?? '#888888')
                : index === 0
                  ? '#FF6500'
                  : '#6B6B6B';
              const isLeader = index === 0;
              const flex = equalSplit ? 1 : isLeader ? 7 : 3;

              const percent = poolExists
                ? getOutcomePercent(entry.outcome.totalStakedKobo, market.totalPoolKobo)
                : null;
              const multiplier = poolExists
                ? getOutcomeMultiplier(entry.outcome.totalStakedKobo, market.totalPoolKobo)
                : null;

              return (
                <View
                  key={entry.outcome.id}
                  style={[
                    styles.outcomeBox,
                    {
                      flex,
                      backgroundColor: isLeader ? `${accent}1F` : '#161616',
                      borderColor: isLeader ? `${accent}55` : '#222222',
                    },
                  ]}
                >
                  <View style={styles.outcomeRow}>
                    <View style={[styles.dot, { backgroundColor: accent }]} />
                    <Text
                      style={[
                        styles.outcomeLabel,
                        isLeader ? styles.outcomeLabelLeader : styles.outcomeLabelTrailer,
                      ]}
                      numberOfLines={1}
                    >
                      {entry.outcome.label}
                    </Text>
                  </View>
                  {poolExists && (
                    <View style={styles.outcomeMeta}>
                      {percent !== null && (
                        <Text
                          style={[
                            isLeader ? styles.percentLeader : styles.percentTrailer,
                            { color: accent },
                          ]}
                        >
                          {percent}%
                        </Text>
                      )}
                      {multiplier !== null && isLeader && (
                        <Text style={styles.multiplier}>{multiplier}x</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {hiddenCount > 0 && (
            <View style={styles.moreOutcomes}>
              <Text style={styles.moreText}>+{hiddenCount} more options</Text>
              <Feather name="chevron-down" size={rs.font(11)} color="#5A5A5A" />
            </View>
          )}
        </View>
      )}

      {/* 4. Quiet metadata strip */}
      <View style={styles.metaStrip}>
        {poolExists ? (
          <Text style={styles.metaItem}>
            <Text style={styles.metaStrong}>{formatPoolKobo(market.totalPoolKobo)}</Text>
            <Text style={styles.metaSoft}> pool</Text>
          </Text>
        ) : (
          <Text style={styles.firstStake}>Be the first to stake</Text>
        )}
        {market.bettorCount > 0 && (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaItem}>
              <Text style={styles.metaStrong}>{market.bettorCount}</Text>
              <Text style={styles.metaSoft}> {market.bettorCount === 1 ? 'staker' : 'stakers'}</Text>
            </Text>
          </>
        )}
        <Text style={styles.metaDot}>·</Text>
        <View style={styles.metaInline}>
          <Feather name="message-square" size={rs.font(11)} color="#5A5A5A" />
          <Text style={styles.metaSoftInline}> {market.commentCount}</Text>
        </View>
      </View>

      {/* 5. Single CTA — context-dependent */}
      <CardCta variant={ctaVariant} />
    </View>
  );
};

const CardCta: React.FC<{ variant: MarketCardCtaVariant }> = ({ variant }) => {
  if (variant === 'stake') {
    return (
      <View style={styles.ctaStake}>
        <Text style={styles.ctaStakeText}>Stake now</Text>
        <Feather name="arrow-right" size={rs.font(14)} color="#0A0A0A" />
      </View>
    );
  }
  return (
    <View style={styles.ctaView}>
      <Text style={styles.ctaViewText}>View market</Text>
      <Feather name="chevron-right" size={rs.font(14)} color="#FF6500" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161616',
    borderRadius: rs.size(16),
    padding: rs.size(16),
  },

  // 1. Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
    flexShrink: 1,
  },
  category: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#7A7A7A',
    letterSpacing: 0.8,
  },
  trending: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#FF6500',
    letterSpacing: 0.6,
  },
  closesIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  closesText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#5A5A5A',
  },
  closesTextUrgent: {
    color: '#FF6500',
    fontFamily: Fonts.semibold,
  },

  // 2. Question
  questionRow: {
    marginTop: rs.size(10),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(12),
  },
  question: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
    lineHeight: rs.font(25),
    letterSpacing: -0.2,
  },
  thumb: {
    width: rs.size(48),
    height: rs.size(48),
    borderRadius: rs.size(12),
    backgroundColor: '#1A1A1A',
  },

  // 3. Outcome block
  outcomesWrap: {
    marginTop: rs.size(16),
    gap: rs.size(8),
  },
  outcomes: {
    flexDirection: 'row',
    gap: rs.size(8),
    alignItems: 'stretch',
  },
  outcomeBox: {
    minWidth: 0,
    borderRadius: rs.size(12),
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(12),
    borderWidth: 1,
    justifyContent: 'space-between',
    gap: rs.size(8),
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(7),
  },
  dot: {
    width: rs.size(7),
    height: rs.size(7),
    borderRadius: rs.size(4),
  },
  outcomeLabel: {
    color: '#FFFFFF',
    flexShrink: 1,
  },
  outcomeLabelLeader: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
  },
  outcomeLabelTrailer: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#BFBFBF',
  },
  outcomeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs.size(6),
  },
  percentLeader: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
  },
  percentTrailer: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
  },
  multiplier: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#6B6B6B',
  },
  moreOutcomes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(4),
    paddingVertical: rs.size(6),
  },
  moreText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#5A5A5A',
    letterSpacing: 0.2,
  },

  // 4. Metadata strip
  metaStrip: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: rs.font(12),
  },
  metaStrong: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#BFBFBF',
  },
  metaSoft: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#5A5A5A',
  },
  metaSoftInline: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#5A5A5A',
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDot: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#3A3A3A',
    paddingHorizontal: rs.size(6),
  },
  firstStake: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#FF6500',
  },

  // 5. CTA
  ctaStake: {
    marginTop: rs.size(14),
    backgroundColor: '#FF6500',
    borderRadius: rs.size(12),
    paddingVertical: rs.size(11),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
  },
  ctaStakeText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#0A0A0A',
    letterSpacing: 0.2,
  },
  ctaView: {
    marginTop: rs.size(14),
    paddingTop: rs.size(12),
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: rs.size(3),
  },
  ctaViewText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#FF6500',
  },
});
