// components/market/ActivityTape.tsx
// Horizontally-scrolling ticker of recent stakes. Each new entry slides in
// from the right via Reanimated's layout `entering`. The strip is the
// single highest "alive" signal on the detail page — it makes the market
// feel like a populated room, not an archive.
//
// We don't yet have a real WebSocket stream of stakes, so this component
// accepts an `entries` prop and renders whatever the caller supplies.
// The detail screen passes a deterministic synthesis derived from the
// market id until the backend ships realtime; swapping the source later
// is a one-line change.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, SlideInRight } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

export interface ActivityEntry {
  id: string;
  /** Display name or "Someone". */
  who: string;
  /** Camp color for the amount glyph. */
  color: string;
  /** Already-formatted amount like `₦5k`. */
  amount: string;
  /** Camp/side label. */
  side: string;
  /** Already-formatted relative time like `12s`. */
  ago: string;
}

interface ActivityTapeProps {
  entries: ActivityEntry[];
}

export const ActivityTape: React.FC<ActivityTapeProps> = ({ entries }) => {
  if (entries.length === 0) return null;

  return (
    <View style={styles.host} accessibilityLabel="Live activity ticker">
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {entries.map((e) => (
          <Animated.View
            key={e.id}
            entering={SlideInRight.duration(220)}
            exiting={FadeOut.duration(180)}
            style={[styles.pill, { borderColor: `${e.color}33` }]}
          >
            <View style={[styles.dot, { backgroundColor: e.color }]} />
            <Animated.Text style={styles.who} numberOfLines={1}>
              {e.who}
            </Animated.Text>
            <Animated.Text style={[styles.amount, { color: e.color }]} numberOfLines={1}>
              {' '}{e.amount}
            </Animated.Text>
            <Animated.Text style={styles.muted} numberOfLines={1}>
              {' '}on{' '}
            </Animated.Text>
            <Animated.Text style={[styles.side, { color: e.color }]} numberOfLines={1}>
              {e.side}
            </Animated.Text>
            <Animated.Text style={styles.ago} numberOfLines={1}>
              {'  '}{e.ago}
            </Animated.Text>
          </Animated.View>
        ))}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    height: rs.size(36),
    justifyContent: 'center',
    backgroundColor: Colors.surface['01'],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border.s01,
  },
  scroll: {
    paddingHorizontal: rs.size(16),
    alignItems: 'center',
    gap: rs.size(10),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(5),
    borderRadius: rs.size(999),
    borderWidth: 1,
    backgroundColor: Colors.surface['02'],
  },
  dot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
    marginRight: rs.size(6),
  },
  who: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: Colors.text.primary,
    maxWidth: rs.size(80),
  },
  amount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  side: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 0.4,
  },
  ago: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
  },
});
