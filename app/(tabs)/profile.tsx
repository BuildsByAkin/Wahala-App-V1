// app/(tabs)/profile.tsx
import { StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/fonts';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>You</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
