import assert from "node:assert/strict";
import test from "node:test";

import type { Board, PostListItem } from "../types";
import { isNoticeContentBoard, noticePostsForFilter } from "../utils/noticeFeed";

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
