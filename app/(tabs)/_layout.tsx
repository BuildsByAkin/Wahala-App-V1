// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useAuth, useMe } from '@/features/auth';
import { formatKoboAsCompactNaira } from '@/lib/utils/money';

function PortfolioBalanceIcon({ color, focused }: { color: string; focused: boolean }) {
  const { walletAvailableKobo } = useAuth();
  const balance = formatKoboAsCompactNaira(walletAvailableKobo);
  return (
    <View style={styles.balanceIconWrap}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.balanceIconText,
          { color },
          focused && styles.balanceIconTextFocused,
        ]}
      >
        <Text style={styles.balanceIconNaira}>₦</Text>
        {balance}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Subscribe to /me once for the whole authenticated session. TanStack Query
  // dedupes, so child screens reading from Redux always see the latest snapshot
  // without each issuing their own /me call.
  useMe();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#555555',
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#1F1F1F',
          borderTopWidth: 1,
          height: rs.size(64) + insets.bottom,
          paddingBottom: insets.bottom + rs.size(8),
          paddingTop: rs.size(8),
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: rs.font(10),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, focused }) => (
            <PortfolioBalanceIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  balanceIconWrap: {
    minWidth: rs.size(40),
    maxWidth: rs.size(72),
    height: rs.size(24),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs.size(4),
  },
  balanceIconText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    textAlign: 'center',
    includeFontPadding: false,
  },
  balanceIconTextFocused: {
    color: '#FFFFFF',
  },
  balanceIconNaira: {
    fontFamily: Fonts.semibold,
    color: '#FF6500',
  },
});
