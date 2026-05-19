// features/audio-room/hooks/use-join-room.ts
import { useMutation } from '@tanstack/react-query';

import { roomApi } from '@/features/audio-room/api/room-api';

export function useJoinRoom() {
  return useMutation({
    mutationFn: (marketId: string) => roomApi.join(marketId),
  });
}

export function useLeaveRoom() {
  return useMutation({
    mutationFn: (marketId: string) => roomApi.leave(marketId),
  });
}
