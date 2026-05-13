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
  getCardSchemeColors,
  isClosingSoon,
} from '@/utils/market';

interface MarketCardFullProps {
  market: Market;
}

type DisplayOutcome = {
  outcome: Outcome;
  tag: 'MOST PICKED' | 'UNDERDOG' | null;
};

function pickDisplayOutcomes(market: Market): { items: DisplayOutcome[]; hiddenCount: number } {
  if (!market.outcomes || market.outcomes.length === 0) return { items: [], hiddenCount: 0 };

  const poolExists = hasPool(market.totalPoolKobo);

  if (market.outcomes.length <= 2) {
    if (!poolExists) {
      return {
        items: market.outcomes.map((outcome) => ({ outcome, tag: null })),
        hiddenCount: 0,
      };
    }
    const top = getMostPicked(market.outcomes);
    const under = getUnderdog(market.outcomes);
    return {
      items: market.outcomes.map((outcome) => {
        if (top && outcome.id === top.id) return { outcome, tag: 'MOST PICKED' as const };
        if (under && outcome.id === under.id && (!top || under.id !== top.id))
          return { outcome, tag: 'UNDERDOG' as const };
        return { outcome, tag: null };
      }),
      hiddenCount: 0,
    };
  }

  const sorted = [...market.outcomes].sort((a, b) => {
    try {
      const sa = BigInt(a.totalStakedKobo);
      const sb = BigInt(b.totalStakedKobo);
      return sb > sa ? 1 : sb < sa ? -1 : 0;
    } catch {
      return 0;
    }
  });

  const top2 = sorted.slice(0, 2);
  const hiddenCount = market.outcomes.length - 2;
  const topId = poolExists ? getMostPicked(market.outcomes)?.id : null;
  const underId = poolExists ? getUnderdog(market.outcomes)?.id : null;

  return {
    items: top2.map((outcome) => {
      if (topId && outcome.id === topId) return { outcome, tag: 'MOST PICKED' as const };
      if (underId && outcome.id === underId && underId !== topId)
        return { outcome, tag: 'UNDERDOG' as const };
      return { outcome, tag: null };
    }),
    hiddenCount,
  };
}

export const MarketCardFull: React.FC<MarketCardFullProps> = ({ market }) => {
  const trending = market.featured;
  const poolExists = hasPool(market.totalPoolKobo);
  const { items: display, hiddenCount } = pickDisplayOutcomes(market);
  const closesLabel = formatClosesIn(market.closesAt);
  const isSoon = isClosingSoon(market.closesAt);
  const isBinary = market.outcomes.length <= 2;
  const scheme = isBinary ? getCardSchemeColors(market.id) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <Feather name="clock" size={rs.font(11)} color={isSoon ? '#FF6500' : '#555555'} />
          <Text style={[styles.closesInText, !isSoon && styles.closesInTextNeutral]}>
            {closesLabel}
          </Text>
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{market.question}</Text>

      {/* Outcome boxes */}
      <View style={styles.outcomesWrap}>
        <View style={styles.outcomes}>
          {display.map(({ outcome, tag }, index) => {
            const percent = poolExists
              ? getOutcomePercent(outcome.totalStakedKobo, market.totalPoolKobo)
              : null;
            const multiplier = poolExists
              ? getOutcomeMultiplier(outcome.totalStakedKobo, market.totalPoolKobo)
              : null;

            let accentColor: string;
            let bg: string;

            if (isBinary && scheme) {
              accentColor = scheme[index] ?? '#888888';
              bg = `${accentColor}18`;
            } else {
              accentColor =
                tag === 'MOST PICKED' ? '#4CAF50' : tag === 'UNDERDOG' ? '#CE93D8' : '#888888';
              bg =
                tag === 'MOST PICKED'
                  ? '#1E3A2F'
                  : tag === 'UNDERDOG'
                    ? '#2A1A2E'
                    : '#1E1E1E';
            }

            return (
              <View
                key={outcome.id}
                style={[
                  styles.outcomeBox,
                  { backgroundColor: bg, borderColor: `${accentColor}40` },
                ]}
              >
                <View style={[styles.outcomeAccentBar, { backgroundColor: accentColor }]} />
                {poolExists && tag && !isBinary && (
                  <Text style={[styles.outcomeTag, { color: accentColor }]}>{tag}</Text>
                )}
                <Text style={styles.outcomeLabel}>{outcome.label}</Text>
                {poolExists && (
                  <View style={styles.outcomeFooter}>
                    {percent !== null && (
                      <Text style={[styles.percentText, { color: accentColor }]}>{percent}%</Text>
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

        {hiddenCount > 0 && (
          <View style={styles.moreOutcomes}>
            <Feather name="chevron-down" size={rs.font(11)} color="#555555" />
            <Text style={styles.moreText}>+{hiddenCount} more options</Text>
          </View>
        )}
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
          <Feather name="message-square" size={rs.font(13)} color="#555555" />
          <Text style={styles.commentCount}> {market.commentCount}</Text>
        </View>
      </View>

      {/* Comment preview */}
      {market.lastComment && (
        <View style={styles.commentPreview}>
          <View style={styles.accentBar} />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.username}>@{market.lastComment.username}</Text>
              {market.lastComment.outcomeBetOn && (
                <View style={styles.commentBadge}>
                  <Text style={styles.commentBadgeText}>
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
  closesInTextNeutral: {
    color: '#555555',
  },
  question: {
    marginTop: rs.size(12),
    fontFamily: Fonts.bold,
    fontSize: rs.font(17),
    color: '#FFFFFF',
    lineHeight: rs.font(24),
  },
  outcomesWrap: {
    marginTop: rs.size(14),
    gap: rs.size(8),
  },
  outcomes: {
    flexDirection: 'row',
    gap: rs.size(8),
    alignItems: 'stretch',
  },
  outcomeBox: {
    flex: 1,
    borderRadius: rs.size(12),
    padding: rs.size(12),
    borderWidth: 1,
    overflow: 'hidden',
  },
  outcomeAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: rs.size(3),
    borderTopLeftRadius: rs.size(12),
    borderBottomLeftRadius: rs.size(12),
  },
  outcomeTag: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(9),
    letterSpacing: 0.8,
  },
  outcomeLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(17),
    color: '#FFFFFF',
    marginTop: rs.size(2),
    marginLeft: rs.size(4),
  },
  outcomeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs.size(6),
    marginLeft: rs.size(4),
  },
  percentText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
  },
  multiplierText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#555555',
  },
  moreOutcomes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(4),
    backgroundColor: '#1A1A1A',
    borderRadius: rs.size(10),
    paddingVertical: rs.size(8),
    borderWidth: 1,
    borderColor: '#242424',
  },
  moreText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#555555',
  },
  poolRow: {
    marginTop: rs.size(14),
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
  commentPreview: {
    marginTop: rs.size(12),
    flexDirection: 'row',
  },
  accentBar: {
    width: rs.size(3),
    borderRadius: rs.size(2),
    backgroundColor: '#2A2A2A',
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
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#777777',
  },
  commentBadge: {
    backgroundColor: '#1E1E1E',
    borderRadius: rs.size(4),
    paddingHorizontal: rs.size(6),
    paddingVertical: rs.size(2),
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  commentBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: '#666666',
  },
  commentText: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
    lineHeight: rs.font(17),
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
