// hooks/useToggleLike.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';
import { commentKeys } from '@/lib/api/query-keys';
import type { Comment } from '@/hooks/useComments';

type ToggleLikeResponse = { liked: boolean; likeCount: number };

async function toggleLike(commentId: string): Promise<ToggleLikeResponse> {
  const { data } = await api.post<ToggleLikeResponse>(
    `/comments/${commentId}/like`
  );
  return data;
}

type Ctx = { previous: Comment[] | undefined };

export function useToggleLike(marketId: string | undefined) {
  const queryClient = useQueryClient();
  const key = commentKeys.list(marketId);

  return useMutation<ToggleLikeResponse, unknown, string, Ctx>({
    mutationFn: (commentId: string) => toggleLike(commentId),

    // Optimistic update — flip hasLiked + adjust likeCount immediately.
    onMutate: async (commentId) => {
      if (!marketId) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Comment[]>(key);
      if (previous) {
        queryClient.setQueryData<Comment[]>(
          key,
          previous.map((c) => {
            if (c.id !== commentId) return c;
            const nextLiked = !c.hasLiked;
            const nextCount = Math.max(
              0,
              c.likeCount + (nextLiked ? 1 : -1)
            );
            return { ...c, hasLiked: nextLiked, likeCount: nextCount };
          })
        );
      }
      return { previous };
    },

    // Roll back on error.
    onError: (_err, _commentId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData<Comment[]>(key, ctx.previous);
      }
    },

    // Reconcile with server truth.
    onSuccess: (data, commentId) => {
      const current = queryClient.getQueryData<Comment[]>(key);
      if (!current) return;
      queryClient.setQueryData<Comment[]>(
        key,
        current.map((c) =>
          c.id === commentId
            ? { ...c, hasLiked: data.liked, likeCount: data.likeCount }
            : c
        )
      );
    },
  });
}
