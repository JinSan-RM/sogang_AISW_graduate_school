import type { QueryClient } from "@tanstack/react-query";

import type { ApiSuccess, PostDetail } from "../types";

export function applyBookmarkResult(queryClient: QueryClient, postId: number, isBookmarked: boolean): void {
  queryClient.setQueryData<ApiSuccess<PostDetail>>(["post", postId], (current) =>
    current
      ? {
          ...current,
          data: {
            ...current.data,
            is_bookmarked: isBookmarked,
          },
        }
      : current
  );
}
