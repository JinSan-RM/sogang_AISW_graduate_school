import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMUNITY_TAB_ROUTE,
  HOME_TAB_ROUTE,
  boardParentRoute,
  postDetailBackAction,
  postDetailBackRoute,
  postDetailRoute,
  routeBoardId,
} from "../utils/appRoutes";

test("전공 커뮤니티 게시판의 상위 경로는 숨겨진 전체 보드가 아니라 홈이다", () => {
  const route = boardParentRoute({ slug: "community-major", category: "community", board_type: "post" });
  assert.equal(route, HOME_TAB_ROUTE);
  assert.notEqual(route, "/(tabs)/boards");
});

test("행사 사진첩과 자료 게시판은 커뮤니티 탭으로 복귀한다", () => {
  assert.equal(boardParentRoute({ slug: "event-album", category: "community", board_type: "album" }), COMMUNITY_TAB_ROUTE);
  assert.equal(boardParentRoute({ slug: "lecture-reviews", category: "resources", board_type: "resource" }), COMMUNITY_TAB_ROUTE);
});

test("알 수 없는 게시판도 전체 보드 대신 홈으로 안전하게 복귀한다", () => {
  assert.equal(boardParentRoute({ slug: "custom-board", category: "custom", board_type: "post" }), HOME_TAB_ROUTE);
});

test("게시판 목록에서 연 상세 글에는 원래 게시판 ID를 기록한다", () => {
  assert.equal(postDetailRoute(91, 16), "/board/post/91?fromBoardId=16");
  assert.equal(postDetailBackRoute(20, "16"), "/board/16");
});

test("직접 링크 상세 글은 해당 글의 게시판 목록을 대체 경로로 사용한다", () => {
  assert.equal(postDetailBackRoute(20), "/board/20");
  assert.equal(postDetailBackRoute(20, "invalid"), "/board/20");
  assert.equal(postDetailBackAction(undefined, true), "replace");
});

test("목록 진입은 기존 스택을 보존하고 스택이 없으면 목록 경로로 대체한다", () => {
  assert.equal(postDetailBackAction("16", true), "back");
  assert.equal(postDetailBackAction("16", false), "replace");
});

test("게시판 경로 파라미터는 양의 정수만 허용한다", () => {
  assert.equal(routeBoardId("16"), 16);
  assert.equal(routeBoardId(["17", "18"]), 17);
  assert.equal(routeBoardId("0"), null);
  assert.equal(routeBoardId("1.5"), null);
});
