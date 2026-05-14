// components/market/comment-composer-sheet.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

const MAX_LENGTH = 280;

type Props = {
  visible: boolean;
  avatarColor: string;
  avatarInitial: string;
  outcomeLabel: string | null;
  outcomeColor: string;
  isSubmitting: boolean;
  onSubmit: (body: string) => void;
  onClose: () => void;
};

export function CommentComposerSheet({
  visible,
  avatarColor,
  avatarInitial,
  outcomeLabel,
  outcomeColor,
  isSubmitting,
  onSubmit,
  onClose,
}: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const translateY = useRef(new Animated.Value(360)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.selectionAsync();
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
      ]).start(() => {
        // Defer focus a frame so the keyboard rises after the sheet settles.
        requestAnimationFrame(() => inputRef.current?.focus());
      });
    } else {
      translateY.setValue(360);
      backdropOpacity.setValue(0);
      setValue('');
    }
  }, [visible, translateY, backdropOpacity]);

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !isSubmitting;

  const handleSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSubmit(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Drop your take</Text>
            {outcomeLabel ? (
              <View
                style={[
                  styles.outcomePill,
                  { borderColor: outcomeColor, backgroundColor: `${outcomeColor}1A` },
                ]}
              >
                <Text style={[styles.outcomePillText, { color: outcomeColor }]}>
                  {outcomeLabel.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              multiline
              maxLength={MAX_LENGTH}
              placeholder="Share what you think..."
              placeholderTextColor="#3A3A3A"
              style={styles.input}
              accessibilityLabel="Comment input"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.counter}>
              {trimmed.length}/{MAX_LENGTH}
            </Text>
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Post comment"
              accessibilityState={{ disabled: !canSend }}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: canSend ? '#FF6500' : '#1F1F1F',
                  opacity: pressed && canSend ? 0.85 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <>
                  <Feather
                    name="send"
                    size={rs.font(14)}
                    color={canSend ? '#0A0A0A' : '#444444'}
                  />
                  <Text
                    style={[
                      styles.sendBtnText,
                      { color: canSend ? '#0A0A0A' : '#444444' },
                    ]}
                  >
                    Post
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: rs.size(28),
    borderTopRightRadius: rs.size(28),
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(10),
    paddingBottom: rs.size(20),
  },
  handle: {
    alignSelf: 'center',
    width: rs.size(40),
    height: rs.size(5),
    borderRadius: rs.size(3),
    backgroundColor: '#2A2A2A',
    marginBottom: rs.size(16),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs.size(12),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
  },
  outcomePill: {
    borderWidth: 1,
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
  },
  outcomePillText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(12),
    backgroundColor: '#181818',
    borderRadius: rs.size(16),
    padding: rs.size(12),
    minHeight: rs.size(96),
  },
  avatar: {
    width: rs.size(32),
    height: rs.size(32),
    borderRadius: rs.size(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    color: '#FFFFFF',
    lineHeight: rs.font(21),
    padding: 0,
    minHeight: rs.size(72),
    maxHeight: rs.size(160),
    textAlignVertical: 'top',
  },
  footerRow: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
  },
  sendBtn: {
    height: rs.size(40),
    paddingHorizontal: rs.size(18),
    borderRadius: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
    minWidth: rs.size(96),
  },
  sendBtnText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    letterSpacing: 0.3,
  },
});
