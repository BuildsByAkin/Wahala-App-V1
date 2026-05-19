// features/reactions/hooks/use-send-reaction.ts
// Client-side throttle = 5/sec (well under the server's 10/sec limit) so a
// rapid-fire user doesn't trigger 429s. The hook silently drops over-cap
// taps — the UI confetti plays locally regardless.
import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

import { reactionsApi } from '@/features/reactions/api/reactions-api';
import { uuidv4 } from '@/features/betting/utils/uuid';
import type { ReactionEmoji } from '@/constants/reactions';

const THROTTLE_WINDOW_MS = 1000;
const MAX_PER_WINDOW = 5;

export function useSendReaction(marketId: string | undefined) {
  const timestamps = useRef<number[]>([]);

  const mutation = useMutation({
    mutationFn: (emoji: ReactionEmoji) =>
      reactionsApi.post({
        marketId: marketId as string,
        emoji,
        clientReactionId: uuidv4(),
      }),
    // Reactions are best-effort — never retry, never surface errors to the
    // user. A failed send is invisible.
    retry: false,
  });

  const send = useCallback(
    (emoji: ReactionEmoji) => {
      if (!marketId) return;
      const now = Date.now();
      timestamps.current = timestamps.current.filter(
        (t) => now - t < THROTTLE_WINDOW_MS
      );
      if (timestamps.current.length >= MAX_PER_WINDOW) return;
      timestamps.current.push(now);
      mutation.mutate(emoji);
    },
    [marketId, mutation]
  );

  return { send };
}
