// app/signup.tsx
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

type SignupStep = 'phone' | 'otp' | 'pin' | 'name';

export default function SignupScreen() {
  const router = useRouter();
  const { sendOtp, signup, setDisplayName, isLoading, error, clearError } =
    useAuth();

  const [step, setStep] = useState<SignupStep>('phone');
  const [phone, setPhone] = useState('');
  // OTP and PIN are kept only in component state — never persisted anywhere.
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [displayName, setLocalDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const canSendCode = isValidNigerianPhone(phone);
  const canVerify = otp.length === 6;
  const pinComplete = pin.length === 4 && confirmPin.length === 4;
  const pinsMatch = pin === confirmPin;
  const canSaveName = displayName.trim().length >= 2;

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const displayedError = localError ?? error;

  // ── Step 1: Phone → request OTP ────────────────────────────────────────
  const handleSendCode = async () => {
    if (!canSendCode || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLocalError(null);
    const result = await sendOtp(phone);
    if (result.ok) {
      setStep('otp');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
    }
  };

  // ── Step 2: OTP → next step (verification happens via signup-complete) ─
  // NOTE: The backend has no separate verify endpoint — the OTP is verified
  // inside POST /auth/signup/complete. In dev, the OTP is printed to backend
  // stdout.
  const handleVerify = () => {
    if (!canVerify) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLocalError(null);
    clearError();
    setStep('pin');
  };

  const handleResend = async () => {
    Haptics.selectionAsync().catch(() => {});
    setOtp('');
    setLocalError(null);
    await sendOtp(phone);
  };

  // ── Step 3: PIN + confirm → signup-complete ────────────────────────────
  const handleCreate = async () => {
    if (!pinComplete) return;
    if (!pinsMatch) {
      setLocalError('PINs do not match');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
      return;
    }
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLocalError(null);
    const result = await signup(phone, otp, pin);
    if (result.ok) {
      // Wipe ephemeral secrets immediately.
      setOtp('');
      setPin('');
      setConfirmPin('');
      setStep('name');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
    }
  };

  // ── Step 4: Display name → PATCH /me, then home ────────────────────────
  const handleSaveName = async () => {
    if (!canSaveName || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await setDisplayName(displayName.trim());
    if (result.ok) {
      router.replace('/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {}
      );
    }
  };

  const handleSkipName = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace('/(tabs)');
  };

  // ── Back navigation ────────────────────────────────────────────────────
  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    setLocalError(null);
    clearError();
    if (step === 'otp') {
      setOtp('');
      setStep('phone');
    } else if (step === 'pin') {
      setPin('');
      setConfirmPin('');
      setStep('otp');
    } else if (step === 'name') {
      // Account is already created at this point — going back doesn't undo
      // signup, but we let the user move forward instead. Keep the back arrow
      // disabled visually by routing to home.
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const handleGoLogin = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  const stepTitle: Record<SignupStep, string> = {
    phone: 'Create account',
    otp: 'Verify your number',
    pin: 'Create your PIN',
    name: "What's your name?",
  };

  const stepSubtitle: Record<SignupStep, string> = {
    phone: 'Enter your phone number to get started',
    otp: `Code sent to ${phone}`,
    pin: 'Choose a 4-digit PIN, then confirm it',
    name: 'This is how others will see you',
  };

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
              {stepTitle[step]}
            </Text>
            <Text allowFontScaling={false} style={styles.subtitle}>
              {stepSubtitle[step]}
            </Text>

            <View style={styles.inputsBlock}>
              {step === 'phone' && (
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
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                    accessibilityLabel="Phone number"
                  />
                  {displayedError ? (
                    <Text allowFontScaling={false} style={styles.errorText}>
                      {displayedError}
                    </Text>
                  ) : null}
                  <View style={styles.buttonSpacer} />
                  <Pressable
                    onPress={handleSendCode}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!canSendCode || isLoading) && styles.buttonDisabled,
                      pressed && canSendCode && !isLoading && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send code"
                    accessibilityState={{ disabled: !canSendCode || isLoading }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.primaryButtonText}>
                        Send code
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {step === 'otp' && (
                <View>
                  <PinInput
                    value={otp}
                    onChangeText={setOtp}
                    autoFocus={false}
                    length={6}
                    secure={false}
                  />
                  {displayedError ? (
                    <Text allowFontScaling={false} style={styles.errorText}>
                      {displayedError}
                    </Text>
                  ) : null}
                  <View style={styles.buttonSpacer} />
                  <Pressable
                    onPress={handleVerify}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      !canVerify && styles.buttonDisabled,
                      pressed && canVerify && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Verify code"
                    accessibilityState={{ disabled: !canVerify }}
                  >
                    <Text allowFontScaling={false} style={styles.primaryButtonText}>
                      Verify
                    </Text>
                  </Pressable>
                  <View style={styles.secondaryRow}>
                    <Pressable
                      onPress={handleBack}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Use a different number"
                    >
                      <Text allowFontScaling={false} style={styles.secondaryText}>
                        Wrong number?
                      </Text>
                    </Pressable>
                    <Text allowFontScaling={false} style={styles.secondaryDot}>
                      {' · '}
                    </Text>
                    <Pressable
                      onPress={handleResend}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Resend code"
                      disabled={isLoading}
                    >
                      <Text allowFontScaling={false} style={styles.secondaryAccent}>
                        Resend
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {step === 'pin' && (
                <View>
                  <Text allowFontScaling={false} style={styles.fieldLabel}>
                    PIN
                  </Text>
                  <PinInput
                    value={pin}
                    onChangeText={(v) => {
                      setPin(v);
                      if (localError) setLocalError(null);
                    }}
                    autoFocus={false}
                    length={4}
                    secure
                  />
                  <View style={styles.fieldSpacer} />
                  <Text allowFontScaling={false} style={styles.fieldLabel}>
                    Confirm PIN
                  </Text>
                  <PinInput
                    value={confirmPin}
                    onChangeText={(v) => {
                      setConfirmPin(v);
                      if (localError) setLocalError(null);
                    }}
                    autoFocus={false}
                    length={4}
                    secure
                  />
                  {displayedError ? (
                    <Text allowFontScaling={false} style={styles.errorText}>
                      {displayedError}
                    </Text>
                  ) : null}
                  <View style={styles.buttonSpacer} />
                  <Pressable
                    onPress={handleCreate}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!pinComplete || isLoading) && styles.buttonDisabled,
                      pressed && pinComplete && !isLoading && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Create account"
                    accessibilityState={{ disabled: !pinComplete || isLoading }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.primaryButtonText}>
                        Create account
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleBack}
                    hitSlop={10}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    disabled={isLoading}
                  >
                    <Text allowFontScaling={false} style={styles.backButtonText}>
                      Back
                    </Text>
                  </Pressable>
                </View>
              )}

              {step === 'name' && (
                <View>
                  <TextInput
                    value={displayName}
                    onChangeText={setLocalDisplayName}
                    placeholder="Your display name"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    maxLength={32}
                    accessibilityLabel="Display name"
                  />
                  {displayedError ? (
                    <Text allowFontScaling={false} style={styles.errorText}>
                      {displayedError}
                    </Text>
                  ) : null}
                  <View style={styles.buttonSpacer} />
                  <Pressable
                    onPress={handleSaveName}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!canSaveName || isLoading) && styles.buttonDisabled,
                      pressed && canSaveName && !isLoading && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Save and continue"
                    accessibilityState={{ disabled: !canSaveName || isLoading }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Colors.black} />
                    ) : (
                      <Text allowFontScaling={false} style={styles.primaryButtonText}>
                        Continue
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleSkipName}
                    hitSlop={10}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Skip for now"
                    disabled={isLoading}
                  >
                    <Text allowFontScaling={false} style={styles.backButtonText}>
                      Skip for now
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {step !== 'name' && (
            <View style={styles.loginRow}>
              <Text allowFontScaling={false} style={styles.loginMuted}>
                Already have an account?{' '}
              </Text>
              <Pressable
                onPress={handleGoLogin}
                hitSlop={10}
                accessibilityRole="link"
                accessibilityLabel="Log in"
              >
                <Text allowFontScaling={false} style={styles.loginCta}>
                  Log in
                </Text>
              </Pressable>
            </View>
          )}
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
    width: rs.size(62),
    height: rs.size(62),
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
  input: {
    backgroundColor: Colors.input,
    borderRadius: rs.size(12),
    height: rs.size(52),
    paddingHorizontal: rs.size(16),
    color: Colors.textPrimary,
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    includeFontPadding: false,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    marginBottom: rs.size(8),
    includeFontPadding: false,
  },
  fieldSpacer: { height: rs.size(20) },
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
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rs.size(16),
  },
  secondaryText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  secondaryDot: {
    color: Colors.textMuted,
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  secondaryAccent: {
    color: Colors.brand,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
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
  loginRow: {
    marginTop: rs.size(20),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rs.size(24),
  },
  loginMuted: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  loginCta: {
    color: Colors.brand,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
});
