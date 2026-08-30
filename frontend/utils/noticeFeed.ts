import type { ApiSuccess, Board, PostListItem } from "../types";

export type NoticeFilter = "all" | "academic" | "event" | "other";

export const NOTICE_FILTERS: { key: NoticeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "academic", label: "학사공지" },
  { key: "event", label: "행사공지" },
  { key: "other", label: "기타공지" },
];

export function noticeFeedQueryFilters(filter: NoticeFilter): {
  notice_category: Exclude<NoticeFilter, "all"> | undefined;
  sort: "latest";
} {
  return {
    notice_category: filter === "all" ? undefined : filter,
    sort: "latest",
  };
}

export function canLoadNextNoticePage({
  hasNextPage,
  isFetchingNextPage,
  isRefreshingFirstPage,
}: {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isRefreshingFirstPage: boolean;
}): boolean {
  return hasNextPage === true && !isFetchingNextPage && !isRefreshingFirstPage;
}

export function noticeFeedFailureState({
  hasData,
  isError,
  isFetchNextPageError,
  refreshFirstPageError,
}: {
  hasData: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  refreshFirstPageError: Error | null;
}) {
  return {
    initial: isError && !hasData && !isFetchNextPageError,
    nextPage: isFetchNextPageError,
    refresh: refreshFirstPageError !== null,
  };
}

type NoticeFeedRetryControls = {
  refetch: () => unknown;
  loadNextPage: () => unknown;
  refreshFirstPage: () => unknown;
};

export function createNoticeFeedRetryActions(controls: NoticeFeedRetryControls) {
  return {
    retryInitial: () => controls.refetch(),
    retryNextPage: () => controls.loadNextPage(),
    retryRefresh: () => controls.refreshFirstPage(),
  };
}

export function isNoticeContentBoard(board: Board) {
  return board.is_active !== false && board.board_type === "notice";
}

export function normalizeNoticeCategory(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const rawCategory = trimmed.toLowerCase();
  if (rawCategory.includes("event") || rawCategory.includes("행사")) return "행사공지";
  if (rawCategory.includes("webinar") || rawCategory.includes("특강")) return "특강공지";
  if (rawCategory.includes("academic") || rawCategory.includes("학사") || rawCategory.includes("calendar")) {
    return "학사공지";
  }
  if (
    rawCategory.includes("all") ||
    rawCategory.includes("전체") ||
    rawCategory.includes("other") ||
    rawCategory.includes("general") ||
    rawCategory.includes("기타")
  ) {
    return "기타공지";
  }
  return trimmed.length <= 8 ? trimmed : "공지";
}

export function categoryFromNoticePost(post: PostListItem, board?: Board) {
  return normalizeNoticeCategory(post.category) ?? normalizeNoticeCategory(board?.slug) ?? "기타공지";
}

export function homeNoticeCategory(post: PostListItem, board?: Board) {
  const category = categoryFromNoticePost(post, board);
  return category === "특강공지" ? "행사공지" : category;
}

export function matchesNoticeFilter(category: string, filter: NoticeFilter) {
  if (filter === "all") return true;
  if (filter === "academic") return category === "학사공지";
  if (filter === "event") return category === "행사공지" || category === "특강공지";
  return category === "기타공지";
}

export function noticePostsForFilter(posts: PostListItem[], boards: Board[], filter: NoticeFilter) {
  const boardById = new Map(boards.map((board) => [board.id, board]));
  const seen = new Set<number>();

  return posts
    .filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    })
    .map((post) => ({ post, category: categoryFromNoticePost(post, boardById.get(post.board_id)) }))
    .filter((item) => matchesNoticeFilter(item.category, filter))
    .sort((left, right) => {
      if (left.post.is_pinned !== right.post.is_pinned) return left.post.is_pinned ? -1 : 1;
      return new Date(right.post.created_at).getTime() - new Date(left.post.created_at).getTime();
    });
}

export function homeNoticePosts(posts: PostListItem[], boards: Board[], limit = 2) {
  const activeNoticeBoardIds = new Set(
    boards.filter(isNoticeContentBoard).map((board) => board.id)
  );
  const seen = new Set<number>();

  return posts
    .filter((post) => {
      if (!activeNoticeBoardIds.has(post.board_id) || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    })
    .sort((left, right) => {
      const createdAtDelta = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return createdAtDelta || right.id - left.id;
    })
    .slice(0, limit);
}

export type HomeNoticePreviewLoader = (params: {
  scope: "notices";
  page: 1;
  size: 2;
  sort: "latest";
  pin_priority: false;
}) => Promise<ApiSuccess<PostListItem[]>>;

export function loadHomeNoticePreview(loadFeed: HomeNoticePreviewLoader) {
  return loadFeed({
    scope: "notices",
    page: 1,
    size: 2,
    sort: "latest",
    pin_priority: false,
  });
}
