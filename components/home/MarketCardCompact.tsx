// components/home/MarketCardCompact.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import {
  type Market,
  type Outcome,
  formatClosesIn,
  formatPoolKobo,
  getCardSchemeColors,
  getOutcomePercent,
  hasPool,
  isClosingSoon,
} from '@/utils/market';
import type { MarketCardCtaVariant } from './MarketCardFull';

interface MarketCardCompactProps {
  market: Market;
  ctaVariant?: MarketCardCtaVariant;
}

type RankedOutcome = { outcome: Outcome; stake: bigint };

function rankOutcomes(outcomes: Outcome[]): RankedOutcome[] {
  return outcomes
    .map((o) => {
      let stake = 0n;
      try {
        stake = BigInt(o.totalStakedKobo);
      } catch {
        stake = 0n;
      }
      return { outcome: o, stake };
    })
    .sort((a, b) => (b.stake > a.stake ? 1 : b.stake < a.stake ? -1 : 0));
}

export const MarketCardCompact: React.FC<MarketCardCompactProps> = ({
  market,
  ctaVariant = 'view',
}) => {
  const poolExists = hasPool(market.totalPoolKobo);
  const closesLabel = formatClosesIn(market.closesAt);
  const isSoon = isClosingSoon(market.closesAt);
  const scheme = getCardSchemeColors(market.id);

  const ranked = rankOutcomes(market.outcomes);
  const visible = ranked.slice(0, 2);
  const leader = visible[0];
  const trailer = visible[1];
  const equalSplit = !poolExists || !leader || !trailer || leader.stake === trailer.stake;

  return (
    <View style={styles.container}>
      {/* 1. Meta row */}
      <View style={styles.metaRow}>
        <Text style={styles.category}>{market.category.toUpperCase()}</Text>
        <View style={styles.closesIn}>
          <Feather name="clock" size={rs.font(10)} color={isSoon ? '#FF6500' : '#5A5A5A'} />
          <Text style={[styles.closesText, isSoon && styles.closesTextUrgent]}>
            {closesLabel}
          </Text>
        </View>
      </View>

      {/* 2. Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* 3. Outcomes — leader/trailer split */}
      {visible.length > 0 && (
        <View style={styles.outcomes}>
          {visible.map((entry, index) => {
            const accent = scheme[index] ?? '#888888';
            const isLeader = index === 0;
            const flex = equalSplit ? 1 : isLeader ? 7 : 3;
            const percent = poolExists
              ? getOutcomePercent(entry.outcome.totalStakedKobo, market.totalPoolKobo)
              : null;
            return (
              <View
                key={entry.outcome.id}
                style={[
                  styles.outcomePill,
                  {
                    flex,
                    backgroundColor: isLeader ? `${accent}1A` : '#161616',
                    borderColor: isLeader ? `${accent}40` : '#222222',
                  },
                ]}
              >
                <View style={styles.outcomeLeft}>
                  <View style={[styles.dot, { backgroundColor: accent }]} />
                  <Text
                    style={[
                      styles.outcomeLabel,
                      !isLeader && styles.outcomeLabelTrailer,
                    ]}
                    numberOfLines={1}
                  >
                    {entry.outcome.label}
                  </Text>
                </View>
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
              </View>
            );
          })}
        </View>
      )}

      {/* 4. Quiet metadata */}
      <View style={styles.metaStrip}>
        {poolExists ? (
          <Text style={styles.metaItem}>
            <Text style={styles.metaStrong}>{formatPoolKobo(market.totalPoolKobo)}</Text>
            <Text style={styles.metaSoft}> pool</Text>
          </Text>
        ) : (
          <Text style={styles.firstStake}>Be the first to stake</Text>
        )}
        <Text style={styles.metaDot}>·</Text>
        <View style={styles.metaInline}>
          <Feather name="message-square" size={rs.font(11)} color="#5A5A5A" />
          <Text style={styles.metaSoftInline}> {market.commentCount}</Text>
        </View>
      </View>

      {/* 5. Single CTA */}
      {ctaVariant === 'stake' ? (
        <View style={styles.ctaStake}>
          <Text style={styles.ctaStakeText}>Stake now</Text>
          <Feather name="arrow-right" size={rs.font(13)} color="#0A0A0A" />
        </View>
      ) : (
        <View style={styles.ctaView}>
          <Text style={styles.ctaViewText}>View market</Text>
          <Feather name="chevron-right" size={rs.font(13)} color="#FF6500" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161616',
    borderRadius: rs.size(16),
    padding: rs.size(16),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#7A7A7A',
    letterSpacing: 0.8,
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
  question: {
    marginTop: rs.size(8),
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
    color: '#FFFFFF',
    lineHeight: rs.font(22),
    letterSpacing: -0.1,
  },
  outcomes: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    gap: rs.size(8),
  },
  outcomePill: {
    minWidth: 0,
    borderRadius: rs.size(10),
    borderWidth: 1,
    paddingVertical: rs.size(9),
    paddingHorizontal: rs.size(11),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs.size(6),
  },
  outcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    flexShrink: 1,
  },
  dot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
  },
  outcomeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
    flexShrink: 1,
  },
  outcomeLabelTrailer: {
    color: '#BFBFBF',
    fontSize: rs.font(12),
  },
  percentLeader: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
  },
  percentTrailer: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
  },
  metaStrip: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
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
  ctaStake: {
    marginTop: rs.size(12),
    backgroundColor: '#FF6500',
    borderRadius: rs.size(10),
    paddingVertical: rs.size(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
  },
  ctaStakeText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: '#0A0A0A',
    letterSpacing: 0.2,
  },
  ctaView: {
    marginTop: rs.size(12),
    paddingTop: rs.size(10),
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
