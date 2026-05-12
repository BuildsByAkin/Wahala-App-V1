// components/home/MarketCardFull.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { Market } from '@/data/placeholder';
import { AvatarStack } from './AvatarStack';

interface MarketCardFullProps {
  market: Market;
}

export const MarketCardFull: React.FC<MarketCardFullProps> = ({ market }) => {
  const trending = market.badges.includes('TRENDING');

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.header}>
        <View style={styles.tags}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{market.category}</Text>
          </View>
          {trending && (
            <View style={styles.trendingTag}>
              <Text style={styles.trendingText}>🔥 TRENDING</Text>
            </View>
          )}
        </View>
        <View style={styles.closesIn}>
          <Feather name="clock" size={rs.font(11)} color="#888888" />
          <Text style={styles.closesInText}>Closes {market.closesIn}</Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* Outcome boxes */}
      <View style={styles.outcomes}>
        {market.outcomes.map((outcome, index) => {
          const isFirst = index === 0;
          return (
            <View
              key={index}
              style={[
                styles.outcomeBox,
                { backgroundColor: isFirst ? '#1E3A2F' : '#2A1A2E' },
              ]}
            >
              <Text
                style={[
                  styles.outcomeTag,
                  { color: isFirst ? '#4CAF50' : '#CE93D8' },
                ]}
              >
                {outcome.tag}
              </Text>
              <Text style={styles.outcomeLabel}>{outcome.label}</Text>
              <View style={styles.outcomeFooter}>
                <Text style={styles.percentText}>{outcome.percent}%</Text>
                <Text style={styles.multiplierText}>{outcome.multiplier}x</Text>
              </View>
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

      {/* Comment preview */}
      {market.lastComment && (
        <View style={styles.commentPreview}>
          <View style={styles.accentBar} />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.username}>{market.lastComment.username}</Text>
              <View style={styles.commentBadge}>
                <Text style={styles.commentBadgeText}>{market.lastComment.badge}</Text>
              </View>
            </View>
            <Text style={styles.commentText} numberOfLines={2}>
              {market.lastComment.text}
            </Text>
          </View>
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
  trendingTag: {
    backgroundColor: '#FF6500',
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
  },
  trendingText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: '#000000',
  },
  closesIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  closesInText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#FF6500',
  },
  question: {
    marginTop: rs.size(12),
    fontFamily: Fonts.bold,
    fontSize: rs.font(17),
    color: '#FFFFFF',
    lineHeight: rs.font(24),
  },
  outcomes: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    gap: rs.size(8),
  },
  outcomeBox: {
    flex: 1,
    borderRadius: rs.size(12),
    padding: rs.size(12),
  },
  outcomeTag: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(9),
    letterSpacing: 0.8,
  },
  outcomeLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
    marginTop: rs.size(2),
  },
  outcomeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs.size(6),
  },
  percentText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
    color: '#FFFFFF',
  },
  multiplierText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#888888',
  },
  poolRow: {
    marginTop: rs.size(14),
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
  commentPreview: {
    marginTop: rs.size(12),
    flexDirection: 'row',
  },
  accentBar: {
    width: rs.size(3),
    borderRadius: rs.size(2),
    backgroundColor: '#FF6500',
    marginRight: rs.size(10),
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  username: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  commentBadge: {
    backgroundColor: '#2A2A2A',
    borderRadius: rs.size(4),
    paddingHorizontal: rs.size(6),
    paddingVertical: rs.size(2),
  },
  commentBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: '#FF6500',
  },
  commentText: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
    lineHeight: rs.font(18),
  },
});
