// features/camp-chat/api/camp-chat-api.ts
// BACKEND.md §6 — camp-scoped private chat. Read + write require the caller
// to currently hold an active bet on the camp's outcome. Defectors lose
// read access immediately (server enforces 403 on next request).
import { api } from '@/lib/api/axios';

export type CampChatAuthor = {
  userId: string;
  username: string;
  displayName: string | null;
};

export type CampChatMessage = {
  id: string;
  marketId: string;
  outcomeId: string;
  body: string;
  createdAt: string;
  author: CampChatAuthor;
  isDeleted: boolean;
  moderationStatus: 'visible' | 'hidden' | 'pending' | string;
};

export type CampChatPage = {
  messages: CampChatMessage[];
  nextCursor: string | null;
};

export const campChatApi = {
  list: async (
    marketId: string,
    outcomeId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<CampChatPage> => {
    const { data } = await api.get<CampChatPage>(
      `/markets/${marketId}/camps/${outcomeId}/chat`,
      {
        params: {
          limit: params.limit ?? 50,
          before: params.before,
        },
      }
    );
    return {
      messages: data?.messages ?? [],
      nextCursor: data?.nextCursor ?? null,
    };
  },

  send: async (params: {
    marketId: string;
    outcomeId: string;
    body: string;
    clientMessageId: string;
  }): Promise<CampChatMessage> => {
    const { data } = await api.post<CampChatMessage>(
      `/markets/${params.marketId}/camps/${params.outcomeId}/chat`,
      { body: params.body, clientMessageId: params.clientMessageId }
    );
    return data;
  },

  remove: async (messageId: string): Promise<void> => {
    await api.delete(`/camps/chat/${messageId}`);
  },
};
