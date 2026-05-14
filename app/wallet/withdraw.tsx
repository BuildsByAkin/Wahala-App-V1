// app/wallet/withdraw.tsx
//
// Withdraw screen — relocated from the old Profile tab.
//   - Top "Withdraw" CTA opens the existing multi-step WithdrawalSheet.
//   - Below it, a live "Recent withdrawals" list (TanStack-backed,
//     handles loading/empty/error inline).
//   - Custom in-screen header with a back button because the root Stack
//     has headerShown:false.
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { useAuth } from '@/features/auth';
import {
  WithdrawalHistory,
  WithdrawalSheet,
  useMyWithdrawals,
} from '@/features/withdrawals';

export default function WithdrawScreen() {
  const router = useRouter();
  const { walletAvailableKobo, refreshMe } = useAuth();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cache-sharing — calling the same hook the inner WithdrawalHistory uses
  // gives us the same query instance (no duplicate request) plus a refetch
  // handle to drive the pull-to-refresh spinner from this screen.
  const { refetch: refetchWithdrawals } = useMyWithdrawals();

  const onWithdrawPress = useCallback(() => {
    Haptics.selectionAsync();
    setSheetVisible(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh wallet balance in parallel with history — the user pulled
      // because they expect both to be current.
      await Promise.allSettled([refetchWithdrawals(), refreshMe()]);
    } finally {
      // `finally` guarantees the spinner is dismissed even if a request
      // throws — TanStack returns rejected promises on network errors.
      setRefreshing(false);
    }
  }, [refetchWithdrawals, refreshMe]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={rs.size(12)}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Feather name="chevron-left" size={rs.font(24)} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6500"
            colors={['#FF6500']}
          />
        }
      >
        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text
            style={styles.balanceAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ₦{formatKoboAsNaira(walletAvailableKobo)}
          </Text>
        </View>

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
          <Feather name="arrow-up-right" size={rs.font(18)} color="#000000" />
          <Text style={styles.withdrawLabel}>Withdraw</Text>
        </Pressable>

        <WithdrawalHistory />
      </ScrollView>

      <WithdrawalSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: rs.size(12),
    paddingTop: rs.size(8),
    paddingBottom: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: rs.size(40),
    height: rs.size(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: rs.size(20),
    paddingBottom: rs.size(40),
  },
  balanceBlock: {
    marginTop: rs.size(16),
    backgroundColor: '#111111',
    borderRadius: rs.size(16),
    padding: rs.size(20),
  },
  balanceLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#666666',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    marginTop: rs.size(6),
    fontFamily: Fonts.bold,
    fontSize: rs.font(32),
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  withdrawButton: {
    marginTop: rs.size(20),
    height: rs.size(52),
    borderRadius: rs.size(12),
    backgroundColor: '#FF6500',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs.size(8),
  },
  withdrawButtonPressed: {
    opacity: 0.85,
  },
  withdrawLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#000000',
  },
});
