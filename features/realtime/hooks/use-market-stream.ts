// features/realtime/hooks/use-market-stream.ts
// Subscribes to GET /markets/:slug/stream for the market the user is currently
// viewing. Splices SSE events into the relevant TanStack Query caches via
// `setQueryData` — NEVER `invalidateQueries` (the motion library animates
// from cache diffs, and a refetch round-trip would skip the tween).
import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { openSseStream } from '@/lib/api/sse';
import {
  activityKeys,
  commentKeys,
  marketKeys,
} from '@/lib/api/query-keys';
import type {
  MarketDetail,
  MarketDetailResponse,
} from '@/features/markets/api/markets-api';
import type {
  ActivityEvent,
  ActivityResponse,
} from '@/features/markets/api/activity-api';
import type { Comment } from '@/hooks/useComments';

type MarketTickEvent = {
  marketId: string;
  totalPoolKobo: string;
  bettorCount: number;
  outcomes: Array<{
    id: string;
    totalStakedKobo?: string;
    totalPoolKobo?: string;
    percent?: number;
    sharePercent?: number;
    bettorCount?: number;
    multiplier?: number | null;
  }>;
};

type MarketResolvedEvent = {
  marketId: string;
  winningOutcomeId: string;
};

type CommentNewEvent = {
  marketId: string;
  comment: Comment;
};

type ReactionNewEvent = {
  marketId: string;
  userId: string;
  emoji: string;
  outcomeId: string | null;
};

export type MarketStreamHandlers = {
  /** Optional — fired when a reaction lands so the confetti layer can play it. */
  onReaction?: (event: ReactionNewEvent) => void;
  /** Optional — fired when the market resolves (useful for triggering the verdict overlay). */
  onResolved?: (event: MarketResolvedEvent) => void;
};

/**
 * Open the SSE stream for the given market and patch caches in place.
 * Pass the *slug* (used to key the detail cache) and the *id* (used to
 * key the comments cache + filter inbound events).
 */
export function useMarketStream(
  slug: string | undefined,
  marketId: string | undefined,
  handlers: MarketStreamHandlers = {}
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!slug || !marketId) return;

    const conn = openSseStream(`/markets/${slug}/stream`, {
      on: {
        'market.tick': ({ data }) => {
          const evt = data as MarketTickEvent | null;
          if (!evt || evt.marketId !== marketId) return;
          queryClient.setQueryData<MarketDetailResponse | undefined>(
            marketKeys.detail(slug),
            (prev) => {
              if (!prev) return prev;
              const patchedOutcomes = prev.outcomes.map((o) => {
                const tick = evt.outcomes.find((x) => x.id === o.id);
                if (!tick) return o;
                return {
                  ...o,
                  totalPoolKobo: tick.totalPoolKobo ?? tick.totalStakedKobo ?? o.totalPoolKobo,
                  sharePercent: tick.sharePercent ?? tick.percent ?? o.sharePercent,
                  bettorCount: tick.bettorCount ?? o.bettorCount,
                  multiplier: tick.multiplier ?? o.multiplier,
                };
              });
              const patchedMarket: MarketDetail = {
                ...prev.market,
                totalPoolKobo: evt.totalPoolKobo,
                bettorCount: evt.bettorCount,
              };
              return { market: patchedMarket, outcomes: patchedOutcomes };
            }
          );
        },

        'market.stake': ({ data }) => {
          const evt = data as ActivityEvent | null;
          if (!evt) return;
          queryClient.setQueryData<InfiniteData<ActivityResponse> | undefined>(
            activityKeys.list(slug),
            (prev) => {
              if (!prev) return prev;
              const [first, ...rest] = prev.pages;
              if (!first) return prev;
              const exists = first.events.some(
                (e) => e.createdAt === evt.createdAt && e.type === evt.type
              );
              if (exists) return prev;
              const nextFirst: ActivityResponse = {
                ...first,
                events: [evt, ...first.events].slice(0, 60),
              };
              return { ...prev, pages: [nextFirst, ...rest] };
            }
          );
        },

        'stance.changed': ({ data }) => {
          const evt = data as ActivityEvent | null;
          if (!evt) return;
          queryClient.setQueryData<InfiniteData<ActivityResponse> | undefined>(
            activityKeys.list(slug),
            (prev) => {
              if (!prev) return prev;
              const [first, ...rest] = prev.pages;
              if (!first) return prev;
              const nextFirst: ActivityResponse = {
                ...first,
                events: [evt, ...first.events].slice(0, 60),
              };
              return { ...prev, pages: [nextFirst, ...rest] };
            }
          );
        },

        'comment.new': ({ data }) => {
          const evt = data as CommentNewEvent | null;
          if (!evt || evt.marketId !== marketId) return;
          queryClient.setQueryData<Comment[] | undefined>(
            commentKeys.list(marketId),
            (prev) => {
              const list = prev ?? [];
              if (list.some((c) => c.id === evt.comment.id)) return list;
              return [evt.comment, ...list];
            }
          );
        },

        'reaction.new': ({ data }) => {
          const evt = data as ReactionNewEvent | null;
          if (!evt || evt.marketId !== marketId) return;
          handlers.onReaction?.(evt);
        },

        'market.resolved': ({ data }) => {
          const evt = data as MarketResolvedEvent | null;
          if (!evt || evt.marketId !== marketId) return;
          queryClient.setQueryData<MarketDetailResponse | undefined>(
            marketKeys.detail(slug),
            (prev) =>
              prev
                ? {
                    ...prev,
                    market: {
                      ...prev.market,
                      status: 'resolved',
                      resolvedOutcomeId: evt.winningOutcomeId,
                    },
                  }
                : prev
          );
          handlers.onResolved?.(evt);
        },
      },
    });

    return () => conn.close();
    // handlers reference is intentionally not in the dep array — closing and
    // re-opening on every parent render would tear down the stream constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, marketId, queryClient]);
}
