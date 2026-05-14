// hooks/useCreateComment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';
import { commentKeys } from '@/lib/api/query-keys';
import type { Comment } from '@/hooks/useComments';

type CreateCommentInput = { body: string };

type CreateCommentResponse = Comment | { comment: Comment } | { data: Comment };

async function postComment(
  marketId: string,
  input: CreateCommentInput
): Promise<Comment> {
  const { data } = await api.post<CreateCommentResponse>(
    `/markets/${marketId}/comments`,
    { body: input.body.trim() }
  );
  if ((data as { comment?: Comment }).comment) {
    return (data as { comment: Comment }).comment;
  }
  if ((data as { data?: Comment }).data) {
    return (data as { data: Comment }).data;
  }
  return data as Comment;
}

export function useCreateComment(marketId: string | undefined) {
  const queryClient = useQueryClient();
  const key = commentKeys.list(marketId);

  return useMutation<Comment, unknown, CreateCommentInput>({
    mutationFn: (input) => {
      if (!marketId) {
        throw new Error('marketId is required to post a comment');
      }
      return postComment(marketId, input);
    },
    onSuccess: (created) => {
      const current = queryClient.getQueryData<Comment[]>(key);
      // Prepend the freshly-created comment so the UI updates instantly even
      // if the server-truth refetch is still in flight.
      if (current) {
        queryClient.setQueryData<Comment[]>(key, [created, ...current]);
      }
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
