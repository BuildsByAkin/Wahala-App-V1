// components/market/CommentComposer.tsx
// Inline gist composer that grows from 44dp → 180dp on focus via spring
// (ANIMATIONS.md §3.B.9 `GistComposerExpand`). Replaces the bottom-sheet
// composer for the in-feed posting flow.
//
// The previous sheet (`CommentComposerSheet`) is still kept for full-screen
// flows; this component is the day-to-day inline path.
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
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { haptic } from '@/lib/motion/haptics';
import { springs } from '@/lib/motion/springs';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const COLLAPSED = 44;
const EXPANDED = 180;
const MAX_LENGTH = 280;

interface Props {
  avatarColor: string;
  avatarInitial: string;
  outcomeLabel: string | null;
  outcomeColor: string;
  isSubmitting: boolean;
  onSubmit: (body: string) => void;
  /** Render-disabled hint (e.g. user hasn't staked). */
  disabledReason?: string | null;
}

export const CommentComposer: React.FC<Props> = ({
  avatarColor,
  avatarInitial,
  outcomeLabel,
  outcomeColor,
  isSubmitting,
  onSubmit,
  disabledReason,
}) => {
  const reduced = useReducedMotion();
  const [value, setValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const height = useSharedValue(COLLAPSED);

  useEffect(() => {
    cancelAnimation(height);
    if (reduced) {
      height.value = withTiming(rs.size(expanded ? EXPANDED : COLLAPSED), { duration: 180 });
    } else {
      height.value = withSpring(rs.size(expanded ? EXPANDED : COLLAPSED), springs.bouncy);
    }
  }, [expanded, reduced, height]);

  const handleFocus = () => {
    if (disabledReason) return;
    haptic.soft();
    setExpanded(true);
  };

  const handleBlur = () => {
    if (value.trim().length === 0) setExpanded(false);
  };

  const expandStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !isSubmitting && !disabledReason;

  const handleSend = () => {
    if (!canSend) return;
    haptic.soft();
    onSubmit(trimmed);
    setValue('');
    setExpanded(false);
    inputRef.current?.blur();
  };

  if (disabledReason) {
    return (
      <View style={styles.disabledHost}>
        <Feather name="lock" size={rs.font(13)} color={Colors.text.tertiary} />
        <Text style={styles.disabledText}>{disabledReason}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.host, expandStyle]}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{avatarInitial}</Text>
      </View>

      <View style={styles.body}>
        {expanded && outcomeLabel ? (
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
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={expanded}
          maxLength={MAX_LENGTH}
          placeholder={expanded ? 'Share what you think...' : 'Drop your take…'}
          placeholderTextColor={Colors.text.disabled}
          style={[styles.input, expanded ? styles.inputExpanded : null]}
          accessibilityLabel="Comment input"
          editable={!isSubmitting}
        />
        {expanded ? (
          <View style={styles.footer}>
            <Text style={styles.counter}>
              {trimmed.length}/{MAX_LENGTH}
            </Text>
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Post comment"
              style={[
                styles.send,
                {
                  backgroundColor: canSend ? Colors.brand : Colors.surface['02'],
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.text.onAction} />
              ) : (
                <>
                  <Feather
                    name="send"
                    size={rs.font(13)}
                    color={canSend ? Colors.text.onAction : Colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.sendText,
                      { color: canSend ? Colors.text.onAction : Colors.text.tertiary },
                    ]}
                  >
                    Post
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(10),
    paddingHorizontal: rs.size(14),
    paddingTop: rs.size(8),
    backgroundColor: Colors.surface['02'],
    borderTopWidth: 1,
    borderTopColor: Colors.border.s02,
    overflow: 'hidden',
  },
  avatar: {
    width: rs.size(28),
    height: rs.size(28),
    borderRadius: rs.size(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rs.size(2),
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.primary,
  },
  body: { flex: 1, gap: rs.size(6) },
  outcomePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(2),
  },
  outcomePillText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.8,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: Colors.text.primary,
    paddingVertical: rs.size(6),
    paddingHorizontal: 0,
  },
  inputExpanded: {
    minHeight: rs.size(80),
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs.size(4),
  },
  counter: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  send: {
    height: rs.size(34),
    paddingHorizontal: rs.size(14),
    borderRadius: rs.size(999),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
    minWidth: rs.size(86),
  },
  sendText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 0.3,
  },
  disabledHost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(14),
    backgroundColor: Colors.surface['02'],
    borderTopWidth: 1,
    borderTopColor: Colors.border.s02,
  },
  disabledText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
});
