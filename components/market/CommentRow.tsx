// components/market/CommentRow.tsx
// Extracted from app/market/[slug].tsx as part of Bundle 3. Adds:
//   • like-heart spring (scale 1 → 1.3 → 1 on `springs.bouncy`),
//   • haptic.tap on like,
//   • inline VoiceNoteBubble support (when comment.voiceUrl is provided).
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { getAvatarColor, getInitial, timeAgo } from '@/utils/market';
import { springs } from '@/lib/motion/springs';
import { haptic } from '@/lib/motion/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Comment } from '@/hooks/useComments';
import { VoiceNoteBubble } from './VoiceNoteBubble';

interface Props {
  comment: Comment;
  outcomeIndexByLabel: Map<string, number>;
  onToggleLike: (commentId: string) => void;
  isPending: boolean;
  resolveColor: (index: number) => string;
}

export const CommentRow: React.FC<Props> = ({
  comment,
  outcomeIndexByLabel,
  onToggleLike,
  isPending,
  resolveColor,
}) => {
  const reduced = useReducedMotion();
  const heartScale = useSharedValue(1);
  const avatarColor = getAvatarColor(comment.author.userId);
  const initial = getInitial(comment.author.displayName, comment.author.username);
  const name = comment.author.displayName || comment.author.username;

  const betLabel = comment.bet?.outcomeLabel ?? null;
  const betIdx = betLabel != null ? outcomeIndexByLabel.get(betLabel) : undefined;
  const betColor = typeof betIdx === 'number' ? resolveColor(betIdx) : Colors.text.secondary;
  const betBg = `${betColor}26`;
  const betBorder = `${betColor}66`;

  const liked = comment.hasLiked;
  const heartColor = liked ? Colors.brand : Colors.border.strong;

  const handleLike = useCallback(() => {
    if (isPending) return;
    haptic.tap();
    if (!reduced) {
      cancelAnimation(heartScale);
      heartScale.value = withSequence(
        withTiming(1.3, { duration: 90 }),
        withSpring(1, springs.bouncy)
      );
    }
    onToggleLike(comment.id);
  }, [comment.id, isPending, onToggleLike, reduced, heartScale]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Optional voice note duck-type — the API may not yet expose voice fields.
  const voiceUrl = (comment as unknown as { voiceUrl?: string | null }).voiceUrl ?? null;
  const voiceDuration = (comment as unknown as { voiceDurationMs?: number | null }).voiceDurationMs ?? null;

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          {betLabel && (
            <View style={[styles.pill, { backgroundColor: betBg, borderColor: betBorder }]}>
              <Text style={[styles.pillText, { color: betColor }]}>{betLabel}</Text>
            </View>
          )}
        </View>
        {voiceUrl ? (
          <View style={styles.voiceWrap}>
            <VoiceNoteBubble
              url={voiceUrl}
              durationMs={voiceDuration ?? 4500}
              tint={betColor}
            />
          </View>
        ) : (
          <Text style={styles.text}>{comment.body}</Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.metaText}>{timeAgo(comment.createdAt)}</Text>
          <Pressable
            onPress={handleLike}
            disabled={isPending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike comment' : 'Like comment'}
            style={styles.likeGroup}
          >
            <Animated.View style={heartStyle}>
              <Feather
                name="heart"
                size={rs.font(13)}
                color={heartColor}
              />
            </Animated.View>
            <Text style={[styles.metaText, { color: heartColor }]}>{comment.likeCount}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(20),
    paddingBottom: rs.size(20),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.hairline,
    flexDirection: 'row',
  },
  avatar: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
  },
  body: { flex: 1, marginLeft: rs.size(12) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  name: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
  },
  pill: {
    marginLeft: 'auto',
    borderRadius: rs.size(6),
    paddingHorizontal: rs.size(7),
    paddingVertical: rs.size(2),
    borderWidth: 1,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
  },
  text: {
    marginTop: rs.size(4),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#BBBBBB',
    lineHeight: rs.font(20),
  },
  voiceWrap: {
    marginTop: rs.size(8),
  },
  meta: {
    marginTop: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(16),
  },
  likeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  metaText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.border.strong,
  },
});
