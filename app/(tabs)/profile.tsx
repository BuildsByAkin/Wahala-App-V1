// app/(tabs)/profile.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

export default function ProfileScreen() {
  const onWithdrawPress = () => {
    Haptics.selectionAsync();
    // TODO: navigate to withdrawal flow once implemented
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Pressable
          onPress={onWithdrawPress}
          accessibilityRole="button"
          accessibilityLabel="Withdraw"
          accessibilityHint="Start a withdrawal to your bank account"
          style={({ pressed }) => [
            styles.withdrawButton,
            pressed && styles.withdrawButtonPressed,
          ]}
        >
          <Text style={styles.withdrawLabel}>Withdraw</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs.size(24),
  },
  withdrawButton: {
    width: '100%',
    height: rs.size(52),
    borderRadius: rs.size(12),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonPressed: {
    opacity: 0.85,
  },
  withdrawLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
  },
});
