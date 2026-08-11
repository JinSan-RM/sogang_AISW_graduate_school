import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMUNITY_TAB_ROUTE,
  HOME_TAB_ROUTE,
  NOTICES_TAB_ROUTE,
  PARTICIPATION_TAB_ROUTE,
  boardParentRoute,
  navigateFromPostDetail,
  postDetailBackDecision,
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
});

test("커뮤니티 글 상세는 탐색 기록이 있어도 커뮤니티 탭으로 바로 복귀한다", () => {
  assert.deepEqual(
    postDetailBackDecision({ slug: "exam-archive", category: "resources", board_type: "resource" }, true),
    { action: "replace", route: COMMUNITY_TAB_ROUTE }
  );
});

test("참여활동 글 상세는 탐색 기록이 있어도 참여활동 탭으로 바로 복귀한다", () => {
  assert.deepEqual(
    postDetailBackDecision({ slug: "networking-programs", category: "participation", board_type: "post" }, true),
    { action: "replace", route: PARTICIPATION_TAB_ROUTE }
  );
});

test("일반 상세 글은 탐색 기록이 있으면 기존 화면으로 복귀한다", () => {
  assert.deepEqual(
    postDetailBackDecision({ slug: "academic-notices", category: "notice", board_type: "notice" }, true),
    { action: "back" }
  );
});

test("직접 링크로 연 일반 상세 글은 제품 상위 경로로 복귀한다", () => {
  assert.deepEqual(
    postDetailBackDecision({ slug: "academic-notices", category: "notice", board_type: "notice" }, false),
    { action: "replace", route: NOTICES_TAB_ROUTE }
  );
});

test("커뮤니티 상세의 공통 뒤로가기 실행기는 기존 목록 대신 탭 경로를 교체한다", () => {
  const calls: string[] = [];
  navigateFromPostDetail(
    { slug: "exam-archive", category: "resources", board_type: "resource" },
    {
      canGoBack: () => true,
      back: () => calls.push("back"),
      replace: (route) => calls.push(`replace:${route}`),
    }
  );

  assert.deepEqual(calls, [`replace:${COMMUNITY_TAB_ROUTE}`]);
});

test("게시판 경로 파라미터는 양의 정수만 허용한다", () => {
  assert.equal(routeBoardId("16"), 16);
  assert.equal(routeBoardId(["17", "18"]), 17);
  assert.equal(routeBoardId("0"), null);
  assert.equal(routeBoardId("1.5"), null);
});
