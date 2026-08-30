import assert from "node:assert/strict";
import test from "node:test";

import type { Board, PostListItem } from "../types";
import {
  isNoticeContentBoard,
  noticePostsForFilter,
  type NoticeFilter,
} from "../utils/noticeFeed";
import * as noticeFeed from "../utils/noticeFeed";

type HomeNoticeSelector = (
  posts: PostListItem[],
  boards: Board[],
  limit?: number
) => PostListItem[];
type HomeNoticeCategory = (post: PostListItem, board?: Board) => string;
type NoticeFeedQueryFilters = (filter: NoticeFilter) => {
  notice_category: Exclude<NoticeFilter, "all"> | undefined;
  sort: "latest";
};
type CanLoadNextNoticePage = (state: {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isRefreshingFirstPage: boolean;
}) => boolean;

function selectHomeNotices(posts: PostListItem[], boards: Board[], limit = 2) {
  const selector = (noticeFeed as typeof noticeFeed & { homeNoticePosts?: HomeNoticeSelector }).homeNoticePosts;
  if (!selector) assert.fail("homeNoticePosts must be exported");
  return selector(posts, boards, limit);
}

function homeCategory(postItem: PostListItem, boardItem?: Board) {
  const helper = (noticeFeed as typeof noticeFeed & { homeNoticeCategory?: HomeNoticeCategory })
    .homeNoticeCategory;
  if (!helper) assert.fail("homeNoticeCategory must be exported");
  return helper(postItem, boardItem);
}

function noticeQueryFilters(filter: NoticeFilter) {
  const helper = (noticeFeed as typeof noticeFeed & {
    noticeFeedQueryFilters?: NoticeFeedQueryFilters;
  }).noticeFeedQueryFilters;
  if (!helper) assert.fail("noticeFeedQueryFilters must be exported");
  return helper(filter);
}

function canLoadNextNoticePage(state: Parameters<CanLoadNextNoticePage>[0]) {
  const helper = (noticeFeed as typeof noticeFeed & {
    canLoadNextNoticePage?: CanLoadNextNoticePage;
  }).canLoadNextNoticePage;
  if (!helper) assert.fail("canLoadNextNoticePage must be exported");
  return helper(state);
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

test("공지 필터는 고정 배치의 클라이언트 필터가 아니라 서버 집계 조건으로 변환된다", () => {
  assert.deepEqual(noticeQueryFilters("all"), {
    notice_category: undefined,
    sort: "latest",
  });
  assert.deepEqual(noticeQueryFilters("academic"), {
    notice_category: "academic",
    sort: "latest",
  });
  assert.deepEqual(noticeQueryFilters("event"), {
    notice_category: "event",
    sort: "latest",
  });
  assert.deepEqual(noticeQueryFilters("other"), {
    notice_category: "other",
    sort: "latest",
  });
});

test("공지 다음 페이지는 다음 페이지가 있고 다른 피드 요청이 없을 때만 불러온다", () => {
  assert.equal(canLoadNextNoticePage({
    hasNextPage: true,
    isFetchingNextPage: false,
    isRefreshingFirstPage: false,
  }), true);
  assert.equal(canLoadNextNoticePage({
    hasNextPage: false,
    isFetchingNextPage: false,
    isRefreshingFirstPage: false,
  }), false);
  assert.equal(canLoadNextNoticePage({
    hasNextPage: true,
    isFetchingNextPage: true,
    isRefreshingFirstPage: false,
  }), false);
  assert.equal(canLoadNextNoticePage({
    hasNextPage: true,
    isFetchingNextPage: false,
    isRefreshingFirstPage: true,
  }), false);
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

test("홈 공지의 other와 all 분류는 기타공지로 표시한다", () => {
  assert.equal(homeCategory(post(1, 1, "other"), board(1, "all-notices")), "기타공지");
});

test("홈 공지의 웨비나와 특강 분류는 행사공지로 표시한다", () => {
  assert.equal(homeCategory(post(1, 4, "webinar"), board(4, "webinar-notices")), "행사공지");
  assert.equal(homeCategory(post(2, 4, "특강공지"), board(4, "webinar-notices")), "행사공지");
});

test("홈 공지의 글 분류가 없으면 게시판 분류를 사용한다", () => {
  assert.equal(homeCategory(post(1, 2), board(2, "academic-notices")), "학사공지");
  assert.equal(homeCategory(post(2, 3), board(3, "event-notices")), "행사공지");
});

test("홈 공지의 사용자용 한글 분류명은 그대로 표시한다", () => {
  assert.equal(homeCategory(post(1, 1, "장학공지"), board(1, "all-notices")), "장학공지");
});
