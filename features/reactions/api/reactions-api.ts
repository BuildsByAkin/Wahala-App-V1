// features/reactions/api/reactions-api.ts
// BACKEND.md §10 — ephemeral reaction events. Rate-limited 10/sec/user
// server-side; we also throttle client-side to be polite.
import { api } from '@/lib/api/axios';

import type { ReactionEmoji } from '@/constants/reactions';

export const reactionsApi = {
  post: async (params: {
    marketId: string;
    emoji: ReactionEmoji;
    clientReactionId: string;
  }): Promise<void> => {
    await api.post(`/markets/${params.marketId}/reactions`, {
      emoji: params.emoji,
      clientReactionId: params.clientReactionId,
    });
  },
};
