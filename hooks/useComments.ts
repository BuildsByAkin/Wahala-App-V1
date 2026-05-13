// hooks/useComments.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';
import { commentKeys } from '@/lib/api/query-keys';

export type CommentAuthor = {
  userId: string;
  username: string;
  displayName: string | null;
  role: 'user' | 'bot' | 'admin' | string;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  bet: { outcomeLabel: string } | null;
  likeCount: number;
  replyCount: number;
  hasLiked: boolean;
  isOwn: boolean;
  isDeleted: boolean;
  moderationStatus: 'visible' | 'hidden' | 'pending' | string;
};

type CommentsResponse =
  | Comment[]
  | { comments: Comment[] }
  | { data: Comment[] };

async function fetchComments(marketId: string): Promise<Comment[]> {
  const { data } = await api.get<CommentsResponse>(
    `/markets/${marketId}/comments`,
    { params: { limit: 20, offset: 0 } }
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { comments?: Comment[] }).comments)) {
    return (data as { comments: Comment[] }).comments;
  }
  if (data && Array.isArray((data as { data?: Comment[] }).data)) {
    return (data as { data: Comment[] }).data;
  }
  return [];
}

export function useComments(marketId: string | undefined) {
  const query = useQuery({
    queryKey: commentKeys.list(marketId),
    queryFn: () => fetchComments(marketId as string),
    enabled: !!marketId,
    staleTime: 30_000,
  });

  const comments = (query.data ?? []).filter(
    (c) => !c.isDeleted && c.moderationStatus === 'visible'
  );

  return {
    comments,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
