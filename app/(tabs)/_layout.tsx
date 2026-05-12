// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

function CustomTabBarButton({ children, onPress }: any) {
  return (
    <Pressable
      onPress={() => {
        console.log('create tapped');
        onPress?.();
      }}
      style={styles.createButtonContainer}
    >
      <View style={styles.createButton}>
        <Text style={styles.createButtonPlus}>+</Text>
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

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
        name="gist"
        options={{
          title: 'Gist',
          tabBarIcon: ({ color }) => <Feather name="message-square" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Feather name="credit-card" size={24} color={color} />,
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
  createButtonContainer: {
    top: rs.size(-16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    width: rs.size(56),
    height: rs.size(56),
    borderRadius: rs.size(28),
    backgroundColor: '#FF6500',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  createButtonPlus: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#000000',
    marginTop: Platform.OS === 'android' ? rs.size(-2) : 0,
  },
});
