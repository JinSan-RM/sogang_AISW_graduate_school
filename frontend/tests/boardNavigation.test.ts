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
  postDetailReturnRoute,
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
  assert.equal(
    postDetailRoute(91, 16, PARTICIPATION_TAB_ROUTE),
    "/board/post/91?fromBoardId=16&returnTo=%2F(tabs)%2Fparticipation",
  );
});

test("상세 복귀 경로는 앱 내부 목록 화면만 허용한다", () => {
  assert.equal(postDetailReturnRoute(PARTICIPATION_TAB_ROUTE), PARTICIPATION_TAB_ROUTE);
  assert.equal(postDetailReturnRoute("/board/28"), "/board/28");
  assert.equal(postDetailReturnRoute("https://example.com"), null);
  assert.equal(postDetailReturnRoute("/board/post/645"), null);
});

test("명시된 목록 화면은 일반 뒤로가기보다 우선해 기존 탭 상태를 복원한다", () => {
  assert.deepEqual(
    postDetailBackDecision(
      { slug: "study-activity", category: "study", board_type: "activity_certification" },
      true,
      "28",
      PARTICIPATION_TAB_ROUTE,
    ),
    { action: "navigate", route: PARTICIPATION_TAB_ROUTE },
  );
});

test("탐색 기록이 있으면 게시판 종류와 무관하게 실제 이전 목록으로 복귀한다", () => {
  for (const board of [
    { slug: "academic-notices", category: "notice", board_type: "notice" },
    { slug: "exam-archive", category: "resources", board_type: "resource" },
    { slug: "study-activity", category: "study", board_type: "activity_certification" },
  ]) {
    assert.deepEqual(postDetailBackDecision(board, true, "13"), { action: "back" });
  }
});

test("탐색 기록이 없으면 출발 게시판 목록으로 복귀한다", () => {
  assert.deepEqual(
    postDetailBackDecision(
      { slug: "study-activity", category: "study", board_type: "activity_certification" },
      false,
      "13",
    ),
    { action: "replace", route: "/board/13" },
  );
});

test("잘못된 출발 게시판은 제품 상위 경로로 대체한다", () => {
  assert.deepEqual(
    postDetailBackDecision(
      { slug: "academic-notices", category: "notice", board_type: "notice" },
      false,
      "invalid",
    ),
    { action: "replace", route: NOTICES_TAB_ROUTE },
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

test("공통 뒤로가기 실행기는 탐색 기록이 있으면 기존 목록을 복원한다", () => {
  const calls: string[] = [];
  navigateFromPostDetail(
    { slug: "exam-archive", category: "resources", board_type: "resource" },
    "16",
    COMMUNITY_TAB_ROUTE,
    {
      canGoBack: () => true,
      back: () => calls.push("back"),
      navigate: (route) => calls.push(`navigate:${route}`),
      replace: (route) => calls.push(`replace:${route}`),
    }
  );

  assert.deepEqual(calls, [`navigate:${COMMUNITY_TAB_ROUTE}`]);
});

test("게시판 경로 파라미터는 양의 정수만 허용한다", () => {
  assert.equal(routeBoardId("16"), 16);
  assert.equal(routeBoardId(["17", "18"]), 17);
  assert.equal(routeBoardId("0"), null);
  assert.equal(routeBoardId("1.5"), null);
});
