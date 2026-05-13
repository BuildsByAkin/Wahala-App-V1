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
  getOutcomePercent,
  hasPool,
  getCardSchemeColors,
  isClosingSoon,
} from '@/utils/market';

interface MarketCardCompactProps {
  market: Market;
}

const FALLBACK_PALETTE = ['#4CAF50', '#FF3B30', '#29B6F6', '#FFA726'];

export const MarketCardCompact: React.FC<MarketCardCompactProps> = ({ market }) => {
  const poolExists = hasPool(market.totalPoolKobo);
  const closesLabel = formatClosesIn(market.closesAt);
  const isSoon = isClosingSoon(market.closesAt);
  const outcomes = (market.outcomes ?? []).slice(0, 2);
  const isBinary = market.outcomes.length <= 2;
  const scheme = isBinary ? getCardSchemeColors(market.id) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{market.category.toUpperCase()}</Text>
        </View>
        <View style={styles.rightInfo}>
          <Feather name="clock" size={rs.font(11)} color={isSoon ? '#FF6500' : '#444444'} />
          <Text style={[styles.infoText, isSoon && styles.infoTextUrgent]}>{closesLabel}</Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* Outcome pills */}
      {outcomes.length > 0 && (
        <View style={styles.outcomes}>
          {outcomes.map((outcome, index) => {
            const dotColor = scheme ? scheme[index] : (FALLBACK_PALETTE[index] ?? '#888888');
            const percent = poolExists
              ? getOutcomePercent(outcome.totalStakedKobo, market.totalPoolKobo)
              : null;
            return (
              <View
                key={outcome.id}
                style={[
                  styles.outcomePill,
                  { backgroundColor: `${dotColor}14`, borderColor: `${dotColor}35` },
                ]}
              >
                <View style={styles.outcomeLeft}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={styles.outcomeLabel}>{outcome.label}</Text>
                </View>
                {percent !== null && (
                  <Text style={[styles.outcomeRight, { color: dotColor }]}>{percent}%</Text>
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
          <Feather name="message-square" size={rs.font(13)} color="#444444" />
          <Text style={styles.commentCount}> {market.commentCount}</Text>
        </View>
      </View>

      {/* CTA row */}
      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>View market</Text>
        <Feather name="chevron-right" size={rs.font(14)} color="#FF6500" />
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
    color: '#555555',
  },
  infoTextUrgent: {
    color: '#FF6500',
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
    borderRadius: rs.size(10),
    borderWidth: 1,
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
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
  },
  poolRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  poolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poolAmount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  poolLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#555555',
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
    color: '#555555',
  },
  ctaRow: {
    marginTop: rs.size(12),
    paddingTop: rs.size(12),
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: rs.size(3),
  },
  ctaText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#FF6500',
  },
});
