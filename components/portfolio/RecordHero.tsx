// components/portfolio/RecordHero.tsx
//
// "Trophy room" hero. Big W—L counter rendered through the odometer, win-rate
// percentage beside it, and a `StreakFlame` reflecting the user's current
// win-streak (consecutive most-recent wins). Pure-display — the parent
// computes wins/losses/streak from the bet history.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { RollingNumber } from '@/components/motion';
import { StreakFlame } from '@/components/home/StreakFlame';
import { rs } from '@/utils/responsive';

export interface RecordHeroProps {
  wins: number;
  losses: number;
  /** Current win streak (consecutive most-recent wins). 0 hides the flame. */
  streak: number;
}

export const RecordHero: React.FC<RecordHeroProps> = ({
  wins,
  losses,
  streak,
}) => {
  const total = wins + losses;
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Text style={styles.label}>RECORD</Text>

      <View style={styles.row}>
        <RollingNumber
          value={wins}
          digitHeight={rs.font(44) * 1.05}
          textStyle={[styles.bigNumber, styles.winColor]}
        />
        <Text style={[styles.bigDash]}> — </Text>
        <RollingNumber
          value={losses}
          digitHeight={rs.font(44) * 1.05}
          textStyle={[styles.bigNumber, styles.lossColor]}
        />
        <View style={styles.flameWrap}>
          <StreakFlame count={streak} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {pct}% win rate · {total} settled
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(8),
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
    letterSpacing: 1.4,
  },
  row: {
    marginTop: rs.size(6),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rs.size(2),
  },
  bigNumber: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(44),
    letterSpacing: -1,
    includeFontPadding: false,
  },
  bigDash: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(40),
    color: Colors.text.tertiary,
    lineHeight: rs.font(44) * 1.05,
    includeFontPadding: false,
  },
  winColor: { color: Colors.status.win },
  lossColor: { color: Colors.status.loss },
  flameWrap: {
    marginLeft: rs.size(12),
    marginBottom: rs.size(8),
  },
  metaRow: {
    marginTop: rs.size(6),
  },
  metaText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
});
