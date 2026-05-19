// features/markets/api/activity-api.ts
// BACKEND.md §8 — unified activity tape for a market. Stakes, stance changes,
// milestones, resolution — all one cursor-paginated stream.
import { api } from '@/lib/api/axios';

export type ActivityEventBase = {
  id?: string;
  createdAt: string;
};

export type StakeEvent = ActivityEventBase & {
  type: 'stake';
  userId: string;
  displayName: string | null;
  outcomeId: string;
  outcomeLabel?: string;
  stakeKobo: string;
};

export type StanceChangeEvent = ActivityEventBase & {
  type: 'stance_change';
  userId: string;
  displayName: string | null;
  fromOutcomeId: string;
  // Server canonical names are `fromOutcomeLabel` / `toOutcomeLabel`; the
  // shorter `fromLabel` / `toLabel` aliases are kept optional for legacy
  // payloads that may still be cached on older clients.
  fromOutcomeLabel?: string;
  fromLabel?: string;
  toOutcomeId: string;
  toOutcomeLabel?: string;
  toLabel?: string;
  atKobo?: string;
  stakeKobo?: string;
  feeKobo?: string;
};

export type MilestoneEvent = ActivityEventBase & {
  type: 'milestone';
  kind: string; // e.g. 'pool_crossed_1m'
};

export type ResolutionEvent = ActivityEventBase & {
  type: 'resolution';
  winningOutcomeId: string;
};

export type ActivityEvent =
  | StakeEvent
  | StanceChangeEvent
  | MilestoneEvent
  | ResolutionEvent;

export type ActivityResponse = {
  events: ActivityEvent[];
  nextCursor: string | null;
};

export const activityApi = {
  list: async (
    slug: string,
    params: { limit?: number; cursor?: string } = {}
  ): Promise<ActivityResponse> => {
    const { data } = await api.get<ActivityResponse>(
      `/markets/${slug}/activity`,
      {
        params: {
          limit: params.limit ?? 30,
          cursor: params.cursor,
        },
      }
    );
    return {
      events: data?.events ?? [],
      nextCursor: data?.nextCursor ?? null,
    };
  },
};
