// components/home/MarketCardFull.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import {
  type Market,
  type Outcome,
  formatClosesIn,
  formatPoolKobo,
  getMostPicked,
  getOutcomeMultiplier,
  getOutcomePercent,
  getUnderdog,
  hasPool,
} from '@/utils/market';

interface MarketCardFullProps {
  market: Market;
}

type DisplayOutcome = {
  outcome: Outcome;
  tag: 'MOST PICKED' | 'UNDERDOG' | null;
};

function pickDisplayOutcomes(market: Market): DisplayOutcome[] {
  if (!market.outcomes || market.outcomes.length === 0) return [];

  if (!hasPool(market.totalPoolKobo)) {
    // No bets yet — show all outcomes, label only, no tags.
    return market.outcomes.map((outcome) => ({ outcome, tag: null }));
  }

  const top = getMostPicked(market.outcomes);
  const under = getUnderdog(market.outcomes);
  return market.outcomes.map((outcome) => {
    if (top && outcome.id === top.id) return { outcome, tag: 'MOST PICKED' as const };
    if (under && outcome.id === under.id && (!top || under.id !== top.id))
      return { outcome, tag: 'UNDERDOG' as const };
    return { outcome, tag: null };
  });
}

export const MarketCardFull: React.FC<MarketCardFullProps> = ({ market }) => {
  const trending = market.featured;
  const poolExists = hasPool(market.totalPoolKobo);
  const display = pickDisplayOutcomes(market);
  const closesLabel = formatClosesIn(market.closesAt);

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.header}>
        <View style={styles.tags}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{market.category.toUpperCase()}</Text>
          </View>
          {trending && (
            <View style={styles.trendingTag}>
              <Text style={styles.trendingText}>🔥 TRENDING</Text>
            </View>
          )}
        </View>
        <View style={styles.closesIn}>
          <Feather name="clock" size={rs.font(11)} color="#888888" />
          <Text style={styles.closesInText}>{closesLabel}</Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* Outcome boxes */}
      <View style={[styles.outcomes, display.length > 2 && styles.outcomesGrid]}>
        {display.map(({ outcome, tag }) => {
          const percent = poolExists
            ? getOutcomePercent(outcome.totalStakedKobo, market.totalPoolKobo)
            : null;
          const multiplier = poolExists
            ? getOutcomeMultiplier(outcome.totalStakedKobo, market.totalPoolKobo)
            : null;
          const bg =
            tag === 'MOST PICKED'
              ? '#1E3A2F'
              : tag === 'UNDERDOG'
                ? '#2A1A2E'
                : '#1E1E1E';
          const tagColor =
            tag === 'MOST PICKED' ? '#4CAF50' : tag === 'UNDERDOG' ? '#CE93D8' : '#888888';
          return (
            <View
              key={outcome.id}
              style={[
                styles.outcomeBox,
                display.length > 2 && styles.outcomeBoxGrid,
                { backgroundColor: bg },
              ]}
            >
              {poolExists && tag && (
                <Text style={[styles.outcomeTag, { color: tagColor }]}>{tag}</Text>
              )}
              <Text style={styles.outcomeLabel}>{outcome.label}</Text>
              {poolExists && (
                <View style={styles.outcomeFooter}>
                  {percent !== null && (
                    <Text style={styles.percentText}>{percent}%</Text>
                  )}
                  {multiplier !== null && (
                    <Text style={styles.multiplierText}>{multiplier}x</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

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

      {/* Comment preview */}
      {market.lastComment && (
        <View style={styles.commentPreview}>
          <View style={styles.accentBar} />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.username}>
                @{market.lastComment.username}
              </Text>
              {market.lastComment.outcomeBetOn && (
                <View style={styles.commentBadge}>
                  <Text style={styles.commentBadgeText}>
                    {market.lastComment.displayName ?? market.lastComment.username} ·{' '}
                    {market.lastComment.outcomeBetOn}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.commentText} numberOfLines={2}>
              {market.lastComment.body}
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
  outcomesGrid: {
    flexWrap: 'wrap',
  },
  outcomeBox: {
    flex: 1,
    borderRadius: rs.size(12),
    padding: rs.size(12),
  },
  outcomeBoxGrid: {
    flexBasis: '48%',
    flexGrow: 1,
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
