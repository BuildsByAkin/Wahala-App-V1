// components/home/MarketCardCompact.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { Market } from '@/data/placeholder';
import { AvatarStack } from './AvatarStack';

interface MarketCardCompactProps {
  market: Market;
}

export const MarketCardCompact: React.FC<MarketCardCompactProps> = ({ market }) => {
  const isLive = market.badges.includes('LIVE');

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.header}>
        <View style={styles.tags}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{market.category}</Text>
          </View>
          {isLive && (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.rightInfo}>
          {market.liveScore ? (
            <>
              <Feather name="disc" size={rs.font(11)} color="#888888" />
              <Text style={styles.infoText}>{market.liveScore}</Text>
            </>
          ) : (
            <Text style={styles.infoText}>{market.closesLabel}</Text>
          )}
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* Outcome pills */}
      <View style={styles.outcomes}>
        {market.outcomes.map((outcome, index) => {
          const isYes = outcome.label === 'Yes';
          const dotColor = isYes ? '#4CAF50' : '#FF3B30';
          return (
            <View key={index} style={styles.outcomePill}>
              <View style={styles.outcomeLeft}>
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                <Text style={styles.outcomeLabel}>{outcome.label}</Text>
              </View>
              <Text style={styles.outcomeRight}>
                {outcome.percent}% · {outcome.multiplier}x
              </Text>
            </View>
          );
        })}
      </View>

      {/* Pool row */}
      <View style={styles.poolRow}>
        <View style={styles.poolLeft}>
          <AvatarStack colors={market.avatarColors} extra={market.extraAvatars} />
          <View style={styles.poolInfo}>
            <Text style={styles.poolAmount}>{market.poolAmount}</Text>
            <Text style={styles.poolLabel}> pool</Text>
          </View>
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
  liveTag: {
    backgroundColor: '#FF3B30',
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  liveDot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#FFFFFF',
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
