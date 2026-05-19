// features/audio-room/api/room-api.ts
// BACKEND.md §12 Phase 1 — read-only room state. Frontend uses this to
// decide whether to render the LiveAudioRoom band at all. Phase 2 (real
// WebRTC tokens via LiveKit/Agora) is explicitly out of scope for now —
// `joinAsListener` returns a stub token the UI does not yet act on.
import { api } from '@/lib/api/axios';

export type RoomSpeaker = {
  userId: string;
  displayName: string | null;
  avatarColor: string;
  isMuted: boolean;
};

export type RoomState = {
  isActive: boolean;
  listenerCount: number;
  speakers: RoomSpeaker[];
  scheduledFor: string | null;
};

export type JoinRoomResponse = {
  token: string;
  expiresAt: string;
};

export const roomApi = {
  state: async (marketId: string): Promise<RoomState> => {
    const { data } = await api.get<RoomState>(`/markets/${marketId}/room`);
    return {
      isActive: data?.isActive ?? false,
      listenerCount: data?.listenerCount ?? 0,
      speakers: data?.speakers ?? [],
      scheduledFor: data?.scheduledFor ?? null,
    };
  },

  join: async (marketId: string): Promise<JoinRoomResponse> => {
    const { data } = await api.post<JoinRoomResponse>(
      `/markets/${marketId}/room/join`
    );
    return data;
  },

  leave: async (marketId: string): Promise<void> => {
    await api.post(`/markets/${marketId}/room/leave`);
  },
};
