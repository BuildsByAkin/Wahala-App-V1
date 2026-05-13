// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useAuth, useMe } from '@/features/auth';
import { formatKoboAsCompactNaira } from '@/lib/utils/money';

function PortfolioBalanceIcon({ focused }: { color: string; focused: boolean }) {
  const { walletAvailableKobo } = useAuth();
  const balance = formatKoboAsCompactNaira(walletAvailableKobo);
  return (
    <View style={styles.portfolioIconWrap}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.balanceText, focused && styles.balanceTextFocused]}
      >
        ₦{balance}
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
        tabBarInactiveTintColor: '#777777',
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
  portfolioIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: rs.size(44),
    height: rs.size(28),
    paddingHorizontal: rs.size(6),
  },
  balanceText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#777777',
    includeFontPadding: false,
  },
  balanceTextFocused: {
    color: '#FFFFFF',
  },
});
