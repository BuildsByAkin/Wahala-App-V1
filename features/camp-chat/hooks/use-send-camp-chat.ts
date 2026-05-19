// features/camp-chat/hooks/use-send-camp-chat.ts
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { campChatKeys } from '@/lib/api/query-keys';
import {
  campChatApi,
  type CampChatMessage,
  type CampChatPage,
} from '@/features/camp-chat/api/camp-chat-api';
import { uuidv4 } from '@/features/betting/utils/uuid';

type SendVars = {
  marketId: string;
  outcomeId: string;
  body: string;
  /** Optional override; the hook generates one per send if omitted. */
  clientMessageId?: string;
};

export function useSendCampChat() {
  const queryClient = useQueryClient();

  return useMutation<CampChatMessage, Error, SendVars>({
    mutationFn: (vars) =>
      campChatApi.send({
        marketId: vars.marketId,
        outcomeId: vars.outcomeId,
        body: vars.body,
        clientMessageId: vars.clientMessageId ?? uuidv4(),
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<InfiniteData<CampChatPage> | undefined>(
        campChatKeys.list(vars.marketId, vars.outcomeId),
        (prev) => {
          if (!prev) return prev;
          const [first, ...rest] = prev.pages;
          if (!first) return prev;
          if (first.messages.some((m) => m.id === msg.id)) return prev;
          const nextFirst: CampChatPage = {
            ...first,
            messages: [msg, ...first.messages],
          };
          return { ...prev, pages: [nextFirst, ...rest] };
        }
      );
    },
  });
}
