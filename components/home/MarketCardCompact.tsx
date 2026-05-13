// components/home/MarketCardCompact.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import {
  type Market,
  formatClosesIn,
  formatPoolKobo,
  getOutcomeMultiplier,
  getOutcomePercent,
  hasPool,
} from '@/utils/market';

interface MarketCardCompactProps {
  market: Market;
}

const DOT_PALETTE = ['#4CAF50', '#FF3B30', '#29B6F6', '#FFA726'];

export const MarketCardCompact: React.FC<MarketCardCompactProps> = ({ market }) => {
  const poolExists = hasPool(market.totalPoolKobo);
  const closesLabel = formatClosesIn(market.closesAt);
  const outcomes = (market.outcomes ?? []).slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.header}>
        <View style={styles.tags}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{market.category.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.rightInfo}>
          <Feather name="clock" size={rs.font(11)} color="#888888" />
          <Text style={styles.infoText}>{closesLabel}</Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* Outcome pills */}
      {outcomes.length > 0 && (
        <View style={styles.outcomes}>
          {outcomes.map((outcome, index) => {
            const dotColor = DOT_PALETTE[index] ?? '#888888';
            const percent = poolExists
              ? getOutcomePercent(outcome.totalStakedKobo, market.totalPoolKobo)
              : null;
            const multiplier = poolExists
              ? getOutcomeMultiplier(outcome.totalStakedKobo, market.totalPoolKobo)
              : null;
            return (
              <View key={outcome.id} style={styles.outcomePill}>
                <View style={styles.outcomeLeft}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={styles.outcomeLabel}>{outcome.label}</Text>
                </View>
                {percent !== null && multiplier !== null && (
                  <Text style={styles.outcomeRight}>
                    {percent}% · {multiplier}x
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Pool row */}
      <View style={styles.poolRow}>
        <View style={styles.poolInfo}>
          {poolExists ? (
            <>
              <Text style={styles.poolAmount}>{formatPoolKobo(market.totalPoolKobo)}</Text>
              <Text style={styles.poolLabel}> pool</Text>
            </>
          ) : (
            <Text style={styles.firstStake}>Be the first to stake</Text>
          )}
        </View>
        <View style={styles.comments}>
          <Feather name="message-square" size={rs.font(13)} color="#888888" />
          <Text style={styles.commentCount}> {market.commentCount}</Text>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161616',
    borderRadius: rs.size(16),
    padding: rs.size(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  categoryTag: {
    backgroundColor: '#2A2A2A',
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  infoText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888888',
  },
  question: {
    marginTop: rs.size(10),
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
    color: '#FFFFFF',
    lineHeight: rs.font(22),
  },
  outcomes: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    gap: rs.size(8),
  },
  outcomePill: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: rs.size(10),
    paddingVertical: rs.size(10),
    paddingHorizontal: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: rs.size(7),
    height: rs.size(7),
    borderRadius: rs.size(3.5),
  },
  outcomeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
    marginLeft: rs.size(6),
  },
  outcomeRight: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888888',
  },
  poolRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  poolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: rs.size(8),
  },
  poolInfoNoAvatars: {
    marginLeft: 0,
  },
  poolAmount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  poolLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
  },
  firstStake: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    color: '#FF6500',
  },
  comments: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCount: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
  },
});
