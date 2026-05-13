// features/withdrawals/components/panes/processing-pane.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { ACCENT } from '../sheet-styles';

type Props = {
  amountKobo: string;
  statusError: string | null;
};

export function ProcessingPane({ amountKobo, statusError }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.iconCircle,
          { backgroundColor: '#1A1208', opacity: pulse },
        ]}
      >
        <Feather name="clock" size={rs.font(28)} color={ACCENT} />
      </Animated.View>
      <Text style={styles.title}>Processing your withdrawal</Text>
      <Text style={styles.subtitle}>
        ₦{formatKoboAsNaira(amountKobo)} is being sent to your bank. This
        usually takes a few seconds.
      </Text>
      <Text style={styles.note}>
        {statusError ?? 'Checking status every few seconds…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: rs.size(16),
    alignItems: 'center',
  },
  iconCircle: {
    width: rs.size(72),
    height: rs.size(72),
    borderRadius: rs.size(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: rs.size(20),
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: rs.size(12),
    lineHeight: rs.font(19),
  },
  note: {
    marginTop: rs.size(16),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
    textAlign: 'center',
  },
});
