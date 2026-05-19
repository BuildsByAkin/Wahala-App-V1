// features/audio-room/hooks/use-room-state.ts
import { useQuery } from '@tanstack/react-query';

import { roomKeys } from '@/lib/api/query-keys';
import { roomApi } from '@/features/audio-room/api/room-api';

export function useRoomState(marketId: string | undefined) {
  return useQuery({
    queryKey: roomKeys.state(marketId),
    queryFn: () => roomApi.state(marketId as string),
    enabled: !!marketId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
