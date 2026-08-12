import type { ApiSuccess, Board, PostListItem } from "../types";

export type PostListFilters = {
  q?: string;
  category?: string;
  status?: string;
  sort?: "latest" | "popular" | "views";
};

export type PostPageLoader = (
  boardId: number,
  page: number,
  size: number,
  filters?: PostListFilters
) => Promise<ApiSuccess<PostListItem[]>>;

export type NoticeFilter = "all" | "academic" | "event" | "other";

export const NOTICE_FILTERS: { key: NoticeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "academic", label: "학사공지" },
  { key: "event", label: "행사공지" },
  { key: "other", label: "기타공지" },
];

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

export async function loadAllBoardPosts(
  boardId: number,
  filters: PostListFilters | undefined,
  loadPage: PostPageLoader,
  pageSize = 20
) {
  const posts: PostListItem[] = [];
  let page = 1;

  while (true) {
    const response = await loadPage(boardId, page, pageSize, filters);
    posts.push(...response.data);

    const pagination = response.pagination;
    if (!pagination || pagination.page >= pagination.total_pages) return posts;
    page = pagination.page + 1;
  }
}
