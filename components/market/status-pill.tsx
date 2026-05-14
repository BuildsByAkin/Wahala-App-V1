// components/market/status-pill.tsx
// Single source of truth for the lifecycle pill on Market Detail.
// Open    → "Closes in 3d 14h" with a clock icon (text.secondary chrome).
// Locked  → "LOCKED" with a lock glyph (status.locked chrome).
// Resolved/Cancelled/Voided → "RESOLVED" / "CANCELLED" / "VOIDED".
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatClosesIn, type MarketStatus } from '@/utils/market';

type Props = {
  status: MarketStatus;
  closesAt: string;
};

export function StatusPill({ status, closesAt }: Props) {
  if (status === 'open' || status === 'scheduled') {
    return (
      <View style={[styles.pill, styles.openPill]}>
        <Feather name="clock" size={rs.font(11)} color={Colors.text.secondary} />
        <Text style={styles.openText}>{formatClosesIn(closesAt)}</Text>
      </View>
    );
  }
  const isLocked = status === 'locked';
  const label =
    status === 'resolved' ? 'RESOLVED'
    : status === 'cancelled' ? 'CANCELLED'
    : status === 'voided' ? 'VOIDED'
    : 'LOCKED';
  return (
    <View style={[styles.pill, styles.closedPill]}>
      <Feather
        name={isLocked ? 'lock' : 'check'}
        size={rs.font(11)}
        color={Colors.status.locked}
      />
      <Text style={styles.closedText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(6),
    borderRadius: rs.size(999),
    borderWidth: 1,
  },
  openPill: {
    backgroundColor: Colors.surface.muted,
    borderColor: Colors.border.subtle,
  },
  openText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
  closedPill: {
    backgroundColor: 'rgba(156,163,175,0.10)',
    borderColor: 'rgba(156,163,175,0.30)',
  },
  closedText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.status.locked,
    letterSpacing: 1.2,
  },
});
