import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { commentApi, postApi } from "../services/api";
import type { ApiSuccess, PostDetail } from "../types";

const PAGE_SIZE = 20;

export function useBoardPosts(
  boardId: number,
  filters?: { q?: string; category?: string; status?: string; sort?: "latest" | "popular" | "views" }
) {
  return useInfiniteQuery({
    queryKey: ["posts", boardId, filters],
    queryFn: ({ pageParam }) => postApi.getPosts(boardId, pageParam, PAGE_SIZE, filters),
    initialPageParam: 1,
    enabled: Number.isFinite(boardId) && boardId > 0,
    retry: false,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination) {
        return undefined;
      }
      return pagination.page < pagination.total_pages ? pagination.page + 1 : undefined;
    },
  });
}

export function useMultiBoardPosts(
  boardIds: number[],
  filters?: { q?: string; category?: string; status?: string; sort?: "latest" | "popular" | "views" }
) {
  return useQuery({
    queryKey: ["multi-board-posts", boardIds, filters],
    queryFn: async () => {
      const responses = await Promise.all(
        boardIds.map((boardId) => postApi.getPosts(boardId, 1, PAGE_SIZE, filters))
      );
      return responses.flatMap((response) => response.data);
    },
    enabled: boardIds.length > 0,
    retry: false,
  });
}

export function usePostDetail(postId: number, enabled = true) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => postApi.getPostDetail(postId),
    enabled: enabled && Number.isFinite(postId) && postId > 0,
  });
}

export function usePostComments(postId: number, enabled = true) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => commentApi.getComments(postId),
    enabled: enabled && Number.isFinite(postId) && postId > 0,
  });
}

type PostMutationPayload = {
  board_id?: number;
  title: string;
  content: string;
  is_anonymous?: boolean;
  category?: string;
  metadata?: Record<string, unknown>;
  attachment_ids?: number[];
};

export function useCreatePost(boardId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PostMutationPayload) => postApi.createPost(boardId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", boardId] });
    },
  });
}

export function useUpdatePost(postId: number, boardId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PostMutationPayload) => postApi.updatePost(postId, payload),
    onSuccess: async (_response, payload) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["post", postId] }),
        queryClient.invalidateQueries({ queryKey: ["posts", boardId] }),
        queryClient.invalidateQueries({ queryKey: ["multi-board-posts"] }),
      ];
      if (payload.board_id && payload.board_id !== boardId) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ["posts", payload.board_id] }));
      }
      await Promise.all(invalidations);
    },
  });
}

export function useUpdateSuggestion(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status: string; admin_reply?: string }) => postApi.updateSuggestion(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
    },
  });
}

export function useUpdateMutualAid(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status: "processing" | "completed" | "rejected"; rejection_reason?: string }) =>
      postApi.updateMutualAid(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mutual-aid"] });
    },
  });
}

export function useDeletePost(postId: number, boardId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", boardId] });
    },
  });
}

export function useToggleLike(postId: number, boardId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postApi.toggleLike(postId),
    onSuccess: (response) => {
      queryClient.setQueryData<ApiSuccess<PostDetail>>(["post", postId], (current) =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                is_liked: response.data.is_liked,
                like_count: response.data.like_count,
              },
            }
          : current
      );
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["posts", boardId] });
    },
  });
}

export function useToggleBookmark(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postApi.toggleBookmark(postId),
    onSuccess: (response) => {
      queryClient.setQueryData<ApiSuccess<PostDetail>>(["post", postId], (current) =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                is_bookmarked: response.data.is_bookmarked,
              },
            }
          : current
      );
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
}

export function useCreateComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { content: string; parent_id?: number | null }) =>
      commentApi.createComment(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
}

export function useUpdateComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      commentApi.updateComment(commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
}

export function useDeleteComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => commentApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
}
