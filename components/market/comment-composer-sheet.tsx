// components/market/comment-composer-sheet.tsx
// Refactored onto the system `SheetBase` primitive (Bundle 2). Behaviour is
// preserved — only the modal shell + entry/exit motion comes from SheetBase.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { SheetBase } from '@/components/motion/SheetBase';
import { haptic } from '@/lib/motion/haptics';

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

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
    setValue('');
    return undefined;
  }, [visible]);

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !isSubmitting;

  const handleSend = () => {
    if (!canSend) return;
    haptic.soft();
    onSubmit(trimmed);
  };

  return (
    <SheetBase visible={visible} onClose={onClose}>
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
          placeholderTextColor={Colors.text.disabled}
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
              backgroundColor: canSend ? Colors.brand : Colors.surface['02'],
              opacity: pressed && canSend ? 0.85 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.text.onAction} />
          ) : (
            <>
              <Feather
                name="send"
                size={rs.font(14)}
                color={canSend ? Colors.text.onAction : Colors.text.tertiary}
              />
              <Text
                style={[
                  styles.sendBtnText,
                  { color: canSend ? Colors.text.onAction : Colors.text.tertiary },
                ]}
              >
                Post
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SheetBase>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs.size(12),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
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
    backgroundColor: Colors.surface['02'],
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
    color: Colors.text.primary,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    color: Colors.text.primary,
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
    color: Colors.text.tertiary,
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
