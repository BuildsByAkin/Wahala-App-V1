// app/(tabs)/profile.tsx
//
// Profile ("You") tab.
//   - Renders synchronously from Redux (auth slice + withdrawal slice). No
//     loading spinner on mount: /me is already fetched once at the tab layout
//     level (`useMe`) and mirrored into Redux on success.
//   - Display-name edit goes through `useAuth().setDisplayName` which patches
//     /me, mirrors into Redux, and seeds the TanStack Query cache.
//   - Logout follows the spec ordering: clear Redux → wipe Query cache →
//     redirect. The root AuthGate also reacts to `isAuthenticated=false` as
//     a fallback.
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { getInitial } from '@/utils/market';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { logout, useAuth } from '@/features/auth';
import { useAppDispatch } from '@/store';

const SAVED_HINT_MS = 2000;

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const {
    username,
    displayName,
    phoneNumber,
    walletAvailableKobo,
    walletLockedKobo,
    leaderboardOptIn,
    setDisplayName,
    setLeaderboardOptIn,
  } = useAuth();

  const [optInBusy, setOptInBusy] = useState(false);

  const [draftName, setDraftName] = useState<string>(displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = draftName.trim();
  const dirty = trimmed !== (displayName ?? '');
  const canSave = dirty && trimmed.length > 0 && !saving;

  const performSave = useCallback(async () => {
    Keyboard.dismiss();
    setSaving(true);
    setSaveError(null);
    const res = await setDisplayName(trimmed);
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error || 'Could not save. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSavedAt(Date.now());
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedAt(null), SAVED_HINT_MS);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [setDisplayName, trimmed]);

  const onToggleLeaderboard = useCallback(
    async (next: boolean) => {
      if (optInBusy) return;
      Haptics.selectionAsync();
      setOptInBusy(true);
      const res = await setLeaderboardOptIn(next);
      setOptInBusy(false);
      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Could not update',
          res.error || 'Try again in a moment.'
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [optInBusy, setLeaderboardOptIn]
  );

  const onSave = useCallback(() => {
    if (!canSave) return;
    Haptics.selectionAsync();
    Keyboard.dismiss();
    Alert.alert(
      'Change display name?',
      `Your name go show as "${trimmed}" to other users. You sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, change it', style: 'default', onPress: performSave },
      ]
    );
  }, [canSave, performSave, trimmed]);

  // Routes for `/wallet/*` aren't all built yet, so the typed-routes plugin
  // doesn't know about them. Cast through `Href` to keep navigation calls
  // honest while letting the destinations be added incrementally.
  const goTo = useCallback(
    (path: string) => {
      router.push(path as Href);
    },
    [router]
  );

  const handleLogout = useCallback(() => {
    // Order matters — clear local state before navigating so the AuthGate's
    // redirect doesn't race a half-cleared session.
    dispatch(logout());
    queryClient.clear();
    router.replace('/auth');
  }, [dispatch, queryClient, router]);

  const confirmLogout = useCallback(() => {
    Haptics.selectionAsync();
    Alert.alert('Log out', 'You go comot?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: handleLogout },
    ]);
  }, [handleLogout]);

  const initial = getInitial(displayName, username ?? '?');
  const headlineName = displayName?.trim() || username || '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {headlineName}
          </Text>
          {username ? (
            <Text style={styles.handle} numberOfLines={1}>
              @{username}
            </Text>
          ) : null}
          {phoneNumber ? (
            <Text style={styles.phone} numberOfLines={1}>
              {phoneNumber}
            </Text>
          ) : null}
        </View>

        {/* Wallet card */}
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>
            ₦{formatKoboAsNaira(walletAvailableKobo)}
          </Text>
          <Text style={styles.walletLocked}>
            Locked: ₦{formatKoboAsNaira(walletLockedKobo)}
          </Text>
        </View>

        {/* Display name editor */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DISPLAY NAME</Text>
          <TextInput
            value={draftName}
            onChangeText={(v) => {
              setDraftName(v);
              if (saveError) setSaveError(null);
              if (savedAt) setSavedAt(null);
            }}
            placeholder="Your name"
            placeholderTextColor="#444444"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            style={styles.input}
            accessibilityLabel="Display name"
            accessibilityHint="How you appear to other users"
          />
          <Text style={styles.helper}>
            This is how you appear to other users
          </Text>

          {dirty ? (
            <Pressable
              onPress={onSave}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Save display name"
              style={({ pressed }) => [
                styles.saveBtn,
                (!canSave || pressed) && styles.saveBtnPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          ) : null}

          {savedAt ? <Text style={styles.savedHint}>Saved</Text> : null}
          {saveError ? <Text style={styles.errorHint}>{saveError}</Text> : null}
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRIVACY</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleIcon}>
                <Feather name="award" size={rs.font(18)} color="#FF6500" />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Show on leaderboard</Text>
                <Text style={styles.toggleHint}>
                  Let other users see your wins and ranking.
                </Text>
              </View>
            </View>
            <Switch
              value={leaderboardOptIn}
              onValueChange={onToggleLeaderboard}
              disabled={optInBusy}
              trackColor={{ false: '#2A2A2A', true: '#FF6500' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#2A2A2A"
              accessibilityLabel="Show on leaderboard"
              accessibilityHint="Toggle public visibility on the leaderboard"
            />
          </View>
        </View>

        {/* Action rows */}
        <View style={styles.actions}>
          <ActionRow
            icon={<Feather name="arrow-up-right" size={rs.font(18)} color="#FF6500" />}
            label="Withdraw funds"
            onPress={() => {
              Haptics.selectionAsync();
              goTo('/wallet/withdraw');
            }}
          />
          <ActionRow
            icon={<Feather name="credit-card" size={rs.font(18)} color="#888888" />}
            label="Bank Accounts"
            onPress={() => {
              Haptics.selectionAsync();
              goTo('/wallet/bank-accounts');
            }}
          />
        </View>

        {/* Legal */}
        <View style={styles.legalSection}>
          <Text style={styles.sectionLabel}>LEGAL</Text>
          <View style={styles.legalGroup}>
            <ActionRow
              icon={<Feather name="file-text" size={rs.font(18)} color="#888888" />}
              label="Terms & Conditions"
              onPress={() => {
                Haptics.selectionAsync();
                goTo('/legal/terms');
              }}
            />
            <ActionRow
              icon={<Feather name="shield" size={rs.font(18)} color="#888888" />}
              label="Privacy Policy"
              onPress={() => {
                Haptics.selectionAsync();
                goTo('/legal/privacy');
              }}
            />
            <ActionRow
              icon={<Feather name="alert-triangle" size={rs.font(18)} color="#888888" />}
              label="Responsible Gaming"
              onPress={() => {
                Haptics.selectionAsync();
                goTo('/legal/responsible-gaming');
              }}
            />
            <ActionRow
              icon={<Feather name="help-circle" size={rs.font(18)} color="#888888" />}
              label="Help & Support"
              onPress={() => {
                Haptics.selectionAsync();
                goTo('/legal/support');
              }}
            />
          </View>
        </View>

        {/* Logout */}
        <Pressable
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          accessibilityHint="Sign out of your account"
          style={({ pressed }) => [
            styles.logoutRow,
            pressed && styles.rowPressed,
          ]}
        >
          <View style={styles.rowLeft}>
            <Feather name="log-out" size={rs.font(18)} color="#FF4444" />
            <Text style={styles.logoutLabel}>Log out</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  icon,
  label,
  right,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        {icon}
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {right}
        <Feather name="chevron-right" size={rs.font(16)} color="#444444" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingBottom: rs.size(40),
  },
  header: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(16),
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: '#FFFFFF',
  },
  identity: {
    marginTop: rs.size(24),
    alignItems: 'center',
    paddingHorizontal: rs.size(20),
  },
  avatar: {
    width: rs.size(80),
    height: rs.size(80),
    borderRadius: rs.size(9999),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6500',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  name: {
    marginTop: rs.size(14),
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
  },
  handle: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#666666',
  },
  phone: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#555555',
  },
  walletCard: {
    marginTop: rs.size(24),
    marginHorizontal: rs.size(20),
    backgroundColor: '#111111',
    borderRadius: rs.size(16),
    padding: rs.size(20),
  },
  walletLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#666666',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  walletAmount: {
    marginTop: rs.size(6),
    fontFamily: Fonts.bold,
    fontSize: rs.font(32),
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  walletLocked: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
  },
  section: {
    marginTop: rs.size(24),
    marginHorizontal: rs.size(20),
  },
  sectionLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#888888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    marginTop: rs.size(8),
    backgroundColor: '#161616',
    borderRadius: rs.size(12),
    height: rs.size(52),
    paddingHorizontal: rs.size(16),
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    color: '#FFFFFF',
  },
  helper: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
  },
  saveBtn: {
    marginTop: rs.size(12),
    height: rs.size(48),
    borderRadius: rs.size(12),
    backgroundColor: '#FF6500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#000000',
  },
  savedHint: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#4CAF50',
  },
  errorHint: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#FF4444',
  },
  toggleRow: {
    marginTop: rs.size(8),
    backgroundColor: '#111111',
    borderRadius: rs.size(12),
    paddingVertical: rs.size(14),
    paddingHorizontal: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs.size(12),
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
  },
  toggleIcon: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(9999),
    backgroundColor: '#1A1208',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  toggleHint: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#777777',
  },
  actions: {
    marginTop: rs.size(24),
    marginHorizontal: rs.size(20),
  },
  legalSection: {
    marginTop: rs.size(24),
    marginHorizontal: rs.size(20),
  },
  legalGroup: {
    marginTop: rs.size(8),
  },
  actionRow: {
    backgroundColor: '#111111',
    borderRadius: rs.size(12),
    padding: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs.size(10),
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  rowLabel: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(15),
    color: '#FFFFFF',
  },
  logoutRow: {
    marginTop: rs.size(32),
    marginHorizontal: rs.size(20),
    marginBottom: rs.size(40),
    backgroundColor: '#1A0A0A',
    borderWidth: 1,
    borderColor: '#2A1A1A',
    borderRadius: rs.size(12),
    padding: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutLabel: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(15),
    color: '#FF4444',
  },
});
