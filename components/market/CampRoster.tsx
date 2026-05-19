// components/market/CampRoster.tsx
// Member roster for a single camp. Reachable from CampSplitHeader tap.
// Each row springs in with a 30ms stagger via Reanimated `FadeInUp`.
//
// REDESIGN_v2.md §4.3.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatPoolKobo } from '@/utils/market';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface RosterMember {
  id: string;
  initial: string;
  name: string;
  stakeKobo: string;
  /** Optional ribbon override for top stakers. */
  isYou?: boolean;
}

interface Props {
  campLabel: string;
  campColor: string;
  members: RosterMember[];
}

export const CampRoster: React.FC<Props> = ({ campLabel, campColor, members }) => {
  const reduced = useReducedMotion();
  return (
    <View style={styles.host}>
      <View style={[styles.header, { borderColor: `${campColor}55` }]}>
        <View style={[styles.swatch, { backgroundColor: campColor }]} />
        <Text style={[styles.title, { color: campColor }]}>{campLabel.toUpperCase()} CAMP</Text>
        <Text style={styles.count}>{members.length.toLocaleString('en-NG')} members</Text>
      </View>

      <View style={styles.list}>
        {members.map((m, i) => (
          <Animated.View
            key={m.id}
            entering={reduced ? undefined : FadeInUp.duration(220).delay(Math.min(i, 10) * 30)}
            style={[
              styles.row,
              m.isYou && { backgroundColor: `${campColor}1A`, borderColor: `${campColor}66` },
            ]}
          >
            <View style={styles.rank}>
              <Text style={styles.rankText}>{i + 1}</Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: `${campColor}26` }]}>
              <Text style={[styles.avatarText, { color: campColor }]}>{m.initial}</Text>
            </View>
            <View style={styles.nameWrap}>
              <Text style={styles.name} numberOfLines={1}>
                {m.name}
              </Text>
              {m.isYou ? <Text style={styles.you}>you</Text> : null}
            </View>
            <Text style={[styles.stake, { color: campColor }]}>
              {formatPoolKobo(m.stakeKobo)}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: rs.size(16),
    gap: rs.size(10),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
    paddingVertical: rs.size(10),
    paddingHorizontal: rs.size(12),
    borderRadius: rs.size(12),
    borderWidth: 1,
  },
  swatch: {
    width: rs.size(10),
    height: rs.size(10),
    borderRadius: rs.size(5),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 1.4,
  },
  count: {
    marginLeft: 'auto',
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  list: { gap: rs.size(6) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
    paddingVertical: rs.size(8),
    paddingHorizontal: rs.size(10),
    borderRadius: rs.size(10),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    backgroundColor: Colors.surface['01'],
  },
  rank: {
    width: rs.size(20),
    alignItems: 'center',
  },
  rankText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  avatar: {
    width: rs.size(28),
    height: rs.size(28),
    borderRadius: rs.size(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  name: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
    flexShrink: 1,
  },
  you: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 0.4,
  },
  stake: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
  },
});
