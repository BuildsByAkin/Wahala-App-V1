// components/home/AvatarStack.tsx
// Overlapping avatars with a `+N` overflow chip. We don't yet have a real
// avatar URL per staker on the market list payload, so we render initials
// over a deterministic colour swatch derived from a stable seed. When the
// API ships avatar URLs the swatch becomes a fallback for off-network state.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { getAvatarColor } from '@/utils/market';

export interface AvatarStackEntry {
  /** Stable id used to derive the swatch colour. */
  id: string;
  /** Optional 1-char glyph (initial). Defaults to '·'. */
  initial?: string;
}

interface AvatarStackProps {
  entries: AvatarStackEntry[];
  /** Total bettor count for the `+N` chip; defaults to entries.length. */
  total?: number;
  /** Max avatars rendered before collapsing to `+N`. Default 5. */
  max?: number;
  /** Avatar diameter. Defaults to 22dp. */
  size?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  entries,
  total,
  max = 5,
  size,
}) => {
  const dim = size ?? rs.size(22);
  const visible = entries.slice(0, max);
  const overflow = Math.max(0, (total ?? entries.length) - visible.length);

  if (visible.length === 0 && overflow === 0) return null;

  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel={`${total ?? entries.length} stakers`}>
      {visible.map((e, i) => (
        <View
          key={e.id}
          style={[
            styles.avatar,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: getAvatarColor(e.id),
              marginLeft: i === 0 ? 0 : -dim * 0.35,
              zIndex: visible.length - i,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize: dim * 0.45 }]} numberOfLines={1}>
            {e.initial ?? '·'}
          </Text>
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.overflow,
            {
              height: dim,
              borderRadius: dim / 2,
              paddingHorizontal: dim * 0.45,
              marginLeft: visible.length > 0 ? -dim * 0.35 : 0,
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: dim * 0.42 }]}>+{overflow}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surface['00'],
  },
  initial: {
    color: '#0A0A0A',
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  overflow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface['02'],
    borderWidth: 1,
    borderColor: Colors.border.s02,
  },
  overflowText: {
    color: Colors.text.secondary,
    fontFamily: Fonts.bold,
  },
});
