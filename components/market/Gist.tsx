// components/market/Gist.tsx
// "Arena chatter" container. Product decision (May 2026): a single public
// gist per market — no Yes/No camp split, no tab switcher. We keep the
// `GistTab` type and the `activeTab` / `onChangeTab` / `hasStance` props
// on the public API for now so callers in app/market/[slug].tsx don't need
// to be untangled, but the header renders a single clean section title.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

export type GistTab = 'public' | 'camp';

interface Props {
  activeTab?: GistTab;
  onChangeTab?: (t: GistTab) => void;
  hasStance?: boolean;
  campLabel?: string | null;
  campColor?: string | null;
}

export const Gist: React.FC<Props> = () => {
  return (
    <View style={styles.host}>
      <View style={styles.header}>
        <Text style={styles.title}>Gist</Text>
        <Text style={styles.subtitle}>What people dey yarn</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: rs.size(20),
    paddingBottom: rs.size(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
});
