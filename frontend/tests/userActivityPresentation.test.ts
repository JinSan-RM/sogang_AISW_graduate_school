import assert from "node:assert/strict";
import test from "node:test";

import {
  bookmarkActivityMeta,
  userActivityCategoryLabel,
} from "../utils/userActivityPresentation";

test("강의후기 스크랩은 Anonymous 없이 날짜만 표시한다", () => {
  assert.equal(bookmarkActivityMeta({
    board_name: "강의후기",
    category: "강의후기",
    author_nickname: "Anonymous",
    author_cohort: null,
    created_at: "2026-08-17T10:00:00Z",
  }), "26.08.17(월)");
});

test("일반 스크랩은 기존 기수·작성자와 날짜를 유지한다", () => {
  assert.equal(bookmarkActivityMeta({
    board_name: "시험족보",
    category: "시험족보",
    author_nickname: "한다현",
    author_cohort: "72",
    created_at: "2026-08-17T10:00:00Z",
  }), "72기 한다현 · 26.08.17(월)");
});

test("활동 카테고리는 자료 게시판 라벨을 우선하고 기존 기본값을 유지한다", () => {
  assert.equal(userActivityCategoryLabel({
    type: "post",
    board_name: "시험족보",
    category: "옛 카테고리",
  }), "시험족보");
  assert.equal(userActivityCategoryLabel({
    type: "comment",
    board_name: "",
    category: "  ",
  }), "댓글");
  assert.equal(userActivityCategoryLabel({
    type: "bookmark",
    board_name: "일반 게시판",
    category: null,
  }), "일반 게시판");
});
