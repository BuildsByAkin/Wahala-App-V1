// components/home/HeaderBar.tsx
// Persistent home header. Logo, streak flame, balance pill (with TickFlash),
// bell. The pill is the cross-app hook into the wallet — tapping anywhere on
// it routes to /wallet. See REDESIGN.md §4.2.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { StreakFlame } from '@/components/home/StreakFlame';
import { rs } from '@/utils/responsive';

interface HeaderBarProps {
  walletAvailableKobo?: string | null;
  streakCount: number;
  /** Notification badge count. 0 hides the dot. */
  notificationCount?: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  streakCount,
  notificationCount = 0,
}) => {
  return (
    <View style={styles.bar} accessibilityRole="header">
      <View style={styles.left}>
        <Text style={styles.logo}>Wahala</Text>
        <StreakFlame count={streakCount} />
      </View>

      <View style={styles.right}>
        <PressableSpring
          variant="ghost"
          haptic="tap"
          style={styles.bell}
          accessibilityLabel="Notifications"
          onPress={() => {
            /* notifications screen lands in a later bundle */
          }}
        >
          <Feather name="bell" size={rs.font(20)} color={Colors.text.primary} />
          {notificationCount > 0 ? <View style={styles.dot} /> : null}
        </PressableSpring>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: rs.size(56),
    paddingHorizontal: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: rs.font(26),
    color: Colors.brand,
    includeFontPadding: false,
  },
  bell: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: rs.size(8),
    right: rs.size(8),
    width: rs.size(7),
    height: rs.size(7),
    borderRadius: rs.size(3.5),
    backgroundColor: '#FF3B30',
  },
});
