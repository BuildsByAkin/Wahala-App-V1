// features/camp-chat/hooks/use-camp-chat.ts
import { useInfiniteQuery } from '@tanstack/react-query';

import { campChatKeys } from '@/lib/api/query-keys';
import { campChatApi, type CampChatPage } from '@/features/camp-chat/api/camp-chat-api';

export function useCampChat(
  marketId: string | undefined,
  outcomeId: string | undefined
) {
  return useInfiniteQuery<CampChatPage>({
    queryKey: campChatKeys.list(marketId, outcomeId),
    queryFn: ({ pageParam }) =>
      campChatApi.list(marketId as string, outcomeId as string, {
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!marketId && !!outcomeId,
    staleTime: 15_000,
  });
}
