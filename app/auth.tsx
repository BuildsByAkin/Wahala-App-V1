// app/auth.tsx
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PinInput } from '@/components/ui/PinInput';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/features/auth';
import { isValidNigerianPhone } from '@/lib/utils/phone';
import { rs } from '@/utils/responsive';

type Step = 'phone' | 'pin';

export default function AuthScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const canContinue = isValidNigerianPhone(phone);
  const canLogin = pin.length === 4;

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleContinue = () => {
    if (!canContinue) {
      setLocalError('Enter a valid Nigerian phone number');
      return;
    }
    setLocalError(null);
    clearError();
    Haptics.selectionAsync().catch(() => {});
    setStep('pin');
  };

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    setPin('');
    setLocalError(null);
    clearError();
    setStep('phone');
  };

  const handleLogin = async () => {
    if (!canLogin || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const result = await login(phone, pin);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      router.replace('/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
      setPin('');
    }
  };

  const handleSignup = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/signup');
  };

  const displayedError = localError ?? error;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={styles.logoCircle}>
              <Text allowFontScaling={false} style={styles.logoLetter}>
                W
              </Text>
            </View>

            <Text allowFontScaling={false} style={styles.title}>
              {step === 'phone' ? 'Welcome back' : 'Enter your PIN'}
            </Text>
            <Text allowFontScaling={false} style={styles.subtitle}>
              {step === 'phone'
                ? 'Enter your phone number to continue'
                : 'Enter your PIN to continue'}
            </Text>

            <View style={styles.inputsBlock}>
              {step === 'phone' ? (
                <View>
                  <TextInput
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(t);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="08012345678"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    style={styles.phoneInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={false}
                    accessibilityLabel="Phone number"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />

                  {displayedError ? (
                    <Text allowFontScaling={false} style={styles.errorText}>
                      {displayedError}
                    </Text>
                  ) : null}

                  <View style={styles.buttonSpacer} />

                  <Pressable
                    onPress={handleContinue}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      !canContinue && styles.buttonDisabled,
                      pressed && canContinue && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                    accessibilityState={{ disabled: !canContinue }}
                  >
                    <Text allowFontScaling={false} style={styles.primaryButtonText}>
                      Continue
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <PinInput
                    value={pin}
                    onChangeText={setPin}
                    autoFocus={false}
                    length={4}
                  />

                  {displayedError ? (
                    <Text allowFontScaling={false} style={styles.errorText}>
                      {displayedError}
                    </Text>
                  ) : null}

                  <View style={styles.buttonSpacer} />

                  <Pressable
                    onPress={handleLogin}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!canLogin || isLoading) && styles.buttonDisabled,
                      pressed && canLogin && !isLoading && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Log in"
                    accessibilityState={{ disabled: !canLogin || isLoading }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.primaryButtonText}>
                        Log in
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleBack}
                    hitSlop={10}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Use a different phone number"
                    disabled={isLoading}
                  >
                    <Text allowFontScaling={false} style={styles.backButtonText}>
                      Use a different number
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={styles.signupRow}>
            <Text allowFontScaling={false} style={styles.signupMuted}>
              Don&apos;t have an account?{' '}
            </Text>
            <Pressable
              onPress={handleSignup}
              hitSlop={10}
              accessibilityRole="link"
              accessibilityLabel="Sign up"
            >
              <Text allowFontScaling={false} style={styles.signupCta}>
                Sign up
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardWrap: {
    width: '100%',
    paddingVertical: rs.size(32),
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: rs.size(24),
    paddingHorizontal: rs.size(24),
    paddingVertical: rs.size(32),
    marginHorizontal: rs.size(24),
    alignItems: 'stretch',
  },
  logoCircle: {
    alignSelf: 'center',
    width: rs.size(52),
    height: rs.size(52),
    borderRadius: rs.size(62) / 2,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: Colors.black,
    fontFamily: Fonts.display,
    fontSize: rs.font(26),
    textAlign: 'center',
    width: rs.size(52),
    includeFontPadding: false,
    right: rs.font(2),
  },
  title: {
    marginTop: rs.size(20),
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(20),
    includeFontPadding: false,
  },
  subtitle: {
    marginTop: rs.size(6),
    textAlign: 'center',
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  inputsBlock: {
    marginTop: rs.size(28),
  },
  phoneInput: {
    backgroundColor: Colors.input,
    borderRadius: rs.size(12),
    height: rs.size(52),
    paddingHorizontal: rs.size(16),
    color: Colors.textPrimary,
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    includeFontPadding: false,
  },
  errorText: {
    marginTop: rs.size(12),
    color: '#FF6B6B',
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    textAlign: 'center',
    includeFontPadding: false,
  },
  buttonSpacer: { height: rs.size(20) },
  primaryButton: {
    height: rs.size(52),
    backgroundColor: Colors.brand,
    borderRadius: rs.size(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: Colors.black,
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    includeFontPadding: false,
  },
  backButton: {
    marginTop: rs.size(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs.size(4),
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  signupRow: {
    marginTop: rs.size(20),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rs.size(24),
  },
  signupMuted: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  signupCta: {
    color: Colors.brand,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
});
