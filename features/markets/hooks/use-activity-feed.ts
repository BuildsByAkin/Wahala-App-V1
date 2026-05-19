// features/markets/hooks/use-activity-feed.ts
import { useInfiniteQuery } from '@tanstack/react-query';

import { activityKeys } from '@/lib/api/query-keys';
import { activityApi, type ActivityResponse } from '@/features/markets/api/activity-api';

export function useActivityFeed(slug: string | undefined) {
  return useInfiniteQuery<ActivityResponse>({
    queryKey: activityKeys.list(slug),
    queryFn: ({ pageParam }) =>
      activityApi.list(slug as string, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!slug,
    staleTime: 15_000,
  });
}
