import assert from "node:assert/strict";
import test from "node:test";

import type { ApiSuccess, Board, PostListItem } from "../types";
import { isNoticeContentBoard, noticePostsForFilter } from "../utils/noticeFeed";
import * as noticeFeed from "../utils/noticeFeed";

type HomeNoticeSelector = (
  posts: PostListItem[],
  boards: Board[],
  limit?: number
) => PostListItem[];
type PostFilters = { q?: string; category?: string; status?: string; sort?: "latest" | "popular" | "views" };
type PostPageLoader = (
  boardId: number,
  page: number,
  size: number,
  filters?: PostFilters
) => Promise<ApiSuccess<PostListItem[]>>;
type AllBoardPostLoader = (
  boardId: number,
  filters: PostFilters | undefined,
  loadPage: PostPageLoader,
  pageSize?: number
) => Promise<PostListItem[]>;

function selectHomeNotices(posts: PostListItem[], boards: Board[], limit = 2) {
  const selector = (noticeFeed as typeof noticeFeed & { homeNoticePosts?: HomeNoticeSelector }).homeNoticePosts;
  if (!selector) assert.fail("homeNoticePosts must be exported");
  return selector(posts, boards, limit);
}

async function loadEveryBoardPost(boardId: number, filters: PostFilters, loadPage: PostPageLoader) {
  const loader = (noticeFeed as typeof noticeFeed & { loadAllBoardPosts?: AllBoardPostLoader }).loadAllBoardPosts;
  if (!loader) assert.fail("loadAllBoardPosts must be exported");
  return loader(boardId, filters, loadPage);
}

function board(id: number, slug: string, boardType = "notice"): Board {
  return {
    id,
    name: slug,
    slug,
    category: "notices",
    board_type: boardType,
    sort_order: id,
    allow_anonymous: false,
    read_permission: "user",
    write_permission: "admin",
    is_active: true,
  };
}

function post(id: number, boardId: number, category?: string, isPinned = false): PostListItem {
  return {
    id,
    board_id: boardId,
    title: `공지 ${id}`,
    content_preview: "",
    author_id: 1,
    author_nickname: "관리자",
    is_anonymous: false,
    is_pinned: isPinned,
    is_notice: true,
    status: "published",
    category,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    created_at: `2026-08-0${id}T00:00:00Z`,
  };
}

const boards = [
  board(1, "all-notices"),
  board(2, "academic-notices"),
  board(3, "event-notices"),
  board(4, "webinar-notices"),
  board(5, "academic-calendar", "calendar"),
];

const homeBoards = [
  ...boards,
  { ...board(6, "inactive-notices"), is_active: false },
];

const posts = [
  post(1, 1, "all"),
  post(2, 2),
  post(3, 3),
  post(4, 4),
  post(5, 1, "academic", true),
];

test("공지 피드 조회 대상에서 일정 게시판을 제외한다", () => {
  assert.deepEqual(boards.filter(isNoticeContentBoard).map((item) => item.id), [1, 2, 3, 4]);
});

test("전체 탭은 학사·행사·특강·기타 공지를 합쳐서 표시한다", () => {
  assert.deepEqual(noticePostsForFilter(posts, boards, "all").map((item) => item.post.id), [5, 4, 3, 2, 1]);
});

test("기타 탭은 전체 공지 게시판의 전체 분류 글도 기타 공지로 표시한다", () => {
  assert.deepEqual(noticePostsForFilter(posts, boards, "other").map((item) => item.post.id), [1]);
});

test("행사 탭은 행사와 특강 공지를 함께 표시한다", () => {
  assert.deepEqual(noticePostsForFilter(posts, boards, "event").map((item) => item.post.id), [4, 3]);
});

test("홈 공지는 모든 활성 공지 카테고리에서 최신 두 개를 선택한다", () => {
  const rows = [
    post(1, 1, "all"),
    post(2, 2, "academic"),
    post(3, 3, "event"),
    post(4, 4, "webinar"),
    post(5, 5, "academic"),
    post(6, 6, "other"),
  ];

  assert.deepEqual(selectHomeNotices(rows, homeBoards).map((item) => item.id), [4, 3]);
});

test("홈 공지는 중복을 제거하고 오래된 고정글보다 최신 일반 공지를 우선한다", () => {
  const oldPinned = {
    ...post(1, 1, "all", true),
    created_at: "2026-07-01T00:00:00Z",
  };
  const newest = post(4, 4, "webinar");
  const secondNewest = post(3, 3, "event");

  assert.deepEqual(
    selectHomeNotices([oldPinned, newest, { ...newest }, secondNewest], homeBoards).map((item) => item.id),
    [4, 3]
  );
});

test("홈 공지는 작성 시간이 같으면 큰 게시글 ID를 먼저 선택한다", () => {
  const sameTime = "2026-08-12T00:00:00Z";
  const rows = [
    { ...post(1, 1), created_at: sameTime },
    { ...post(2, 2), created_at: sameTime },
    { ...post(3, 3), created_at: "2026-08-11T00:00:00Z" },
  ];

  assert.deepEqual(selectHomeNotices(rows, homeBoards).map((item) => item.id), [2, 1]);
});

test("홈 공지 조회는 최신 일반 공지가 고정글 첫 페이지 밖에 있어도 모든 페이지를 모은다", async () => {
  const requestedPages: number[] = [];
  const loadPage: PostPageLoader = async (boardId, page, size, filters) => {
    assert.equal(boardId, 9);
    assert.equal(size, 20);
    assert.deepEqual(filters, { sort: "latest" });
    requestedPages.push(page);
    return {
      status: "success",
      data: [post(page, 9)],
      pagination: { page, size, total: 41, total_pages: 3 },
    };
  };

  const rows = await loadEveryBoardPost(9, { sort: "latest" }, loadPage);

  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.deepEqual(rows.map((item) => item.id), [1, 2, 3]);
});
