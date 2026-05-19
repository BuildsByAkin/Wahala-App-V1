// features/markets/api/camp-roster-api.ts
// BACKEND.md §5.2 — paginated members of a single camp. Tap-through view
// from the camp-split header / roster sheet.
import { api } from '@/lib/api/axios';

export type RosterMember = {
  userId: string;
  displayName: string | null;
  username: string;
  stakeKobo: string;
  joinedAt: string;
  avatarColor: string;
  role: 'whale' | 'standard';
};

export type RosterResponse = {
  members: RosterMember[];
  total: number;
};

export const campRosterApi = {
  list: async (
    slug: string,
    outcomeId: string,
    params: { sort?: 'stake' | 'joined'; limit?: number; offset?: number } = {}
  ): Promise<RosterResponse> => {
    const { data } = await api.get<RosterResponse>(
      `/markets/${slug}/camps/${outcomeId}/members`,
      {
        params: {
          sort: params.sort ?? 'stake',
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
        },
      }
    );
    return {
      members: data?.members ?? [],
      total: data?.total ?? 0,
    };
  },
};
