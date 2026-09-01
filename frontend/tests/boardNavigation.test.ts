import assert from "node:assert/strict";
import test from "node:test";

import * as appRoutes from "../utils/appRoutes";
import {
  COMMUNITY_TAB_ROUTE,
  HOME_TAB_ROUTE,
  NOTICES_TAB_ROUTE,
  PARTICIPATION_TAB_ROUTE,
  boardParentRoute,
  navigateFromPostDetail,
  postCreateBackDecision,
  postDetailBackDecision,
  postCreateCompletionRoute,
  postCreateRoute,
  postCreateRouteFromBoardList,
  postDetailRoute,
  postDetailReturnRoute,
  routeBoardId,
} from "../utils/appRoutes";

type PostCreateFormInstanceKey = (params: {
  boardId?: unknown;
  postId?: unknown;
  category?: unknown;
}) => string;

type PostEditCompletionDecision =
  | { action: "back" }
  | { action: "replace"; route: `/board/post/${number}` };

function getPostCreateFormInstanceKey() {
  const helper = Reflect.get(appRoutes, "postCreateFormInstanceKey");
  assert.equal(typeof helper, "function", "글쓰기 라우트별 폼 인스턴스 키 생성기가 필요합니다");
  return helper as PostCreateFormInstanceKey;
}

function getActivityPostEditRouteFromDetail() {
  const helper = Reflect.get(appRoutes, "activityPostEditRouteFromDetail");
  assert.equal(typeof helper, "function", "활동인증 상세 전용 수정 경로 생성기가 필요합니다");
  return helper as (boardId: number, postId: number) => string;
}

function getPostEditCompletionDecision() {
  const helper = Reflect.get(appRoutes, "postEditCompletionDecision");
  assert.equal(typeof helper, "function", "게시글 수정 완료 복귀 판정기가 필요합니다");
  return helper as (
    boardType: string | undefined,
    editOrigin: unknown,
    canGoBack: boolean,
    postId: number,
  ) => PostEditCompletionDecision;
}

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

test("활동 인증 작성 완료 상세는 참여활동 복귀 정보를 보존한다", () => {
  assert.equal(
    postCreateCompletionRoute("activity_certification", 170, 12),
    "/board/post/170?fromBoardId=12&returnTo=%2F(tabs)%2Fparticipation",
  );
});

test("상조회와 건의 작성 완료는 기존 게시판 복귀 경로를 유지한다", () => {
  assert.equal(postCreateCompletionRoute("mutual_aid", 170, 12), "/board/12");
  assert.equal(postCreateCompletionRoute("suggestion", 170, 12), "/board/12");
});

test("자료공유 글쓰기는 기존 탐색 기록과 무관하게 커뮤니티로 복귀하도록 출발지를 기록한다", () => {
  assert.equal(
    postCreateRouteFromBoardList(7, "시험족보", true, false, COMMUNITY_TAB_ROUTE),
    "/board/post/create?boardId=7&category=%EC%8B%9C%ED%97%98%EC%A1%B1%EB%B3%B4&returnTo=%2F(tabs)%2Fcommunity",
  );
  assert.deepEqual(
    postCreateBackDecision(COMMUNITY_TAB_ROUTE, true, 7),
    { action: "navigate", route: COMMUNITY_TAB_ROUTE },
  );
});

test("스터디 모집 글쓰기는 기존 탐색 기록과 무관하게 참여활동으로 복귀한다", () => {
  assert.equal(
    postCreateRouteFromBoardList(25, "모집", true, false, PARTICIPATION_TAB_ROUTE),
    "/board/post/create?boardId=25&category=%EB%AA%A8%EC%A7%91&returnTo=%2F(tabs)%2Fparticipation",
  );
  assert.deepEqual(
    postCreateBackDecision(PARTICIPATION_TAB_ROUTE, true, 25),
    { action: "navigate", route: PARTICIPATION_TAB_ROUTE },
  );
});

test("자료공유에서 스터디로 이동하면 각 게시판의 글쓰기 폼을 새로 사용한다", () => {
  const formInstanceKey = getPostCreateFormInstanceKey();
  const resourceForm = formInstanceKey({ boardId: "7", category: "시험족보" });
  const studyForm = formInstanceKey({ boardId: "25", category: "모집" });

  assert.notEqual(resourceForm, studyForm);
  assert.equal(resourceForm, '[7,null,"시험족보"]');
  assert.equal(studyForm, '[25,null,"모집"]');
});

test("스터디에서 자료공유로 돌아가도 이전 글쓰기 상태를 재사용하지 않는다", () => {
  const formInstanceKey = getPostCreateFormInstanceKey();
  const studyForm = formInstanceKey({ boardId: ["25"], category: ["모집"] });
  const resourceForm = formInstanceKey({ boardId: ["7"], category: ["시험족보"] });

  assert.notEqual(studyForm, resourceForm);
  assert.equal(studyForm, '[25,null,"모집"]');
  assert.equal(resourceForm, '[7,null,"시험족보"]');
});

test("같은 게시판에서도 작성·수정·카테고리별 폼 인스턴스를 구분한다", () => {
  const formInstanceKey = getPostCreateFormInstanceKey();
  const createRecruit = formInstanceKey({ boardId: "25", category: "모집" });
  const editRecruit = formInstanceKey({ boardId: "25", postId: "204", category: "모집" });
  const createReview = formInstanceKey({ boardId: "25", category: "후기" });

  assert.equal(new Set([createRecruit, editRecruit, createReview]).size, 3);
  assert.equal(formInstanceKey({ boardId: "25", category: "모집" }), createRecruit);
});

test("스터디와 동아리 활동인증 상세의 수정 경로는 상세 출발 조건을 기록한다", () => {
  const editRoute = getActivityPostEditRouteFromDetail();
  assert.equal(
    editRoute(10, 204),
    "/board/post/create?boardId=10&postId=204&editOrigin=post-detail",
  );
  assert.equal(
    editRoute(11, 205),
    "/board/post/create?boardId=11&postId=205&editOrigin=post-detail",
  );
});

test("상세에서 수정한 활동인증만 저장 후 기존 상세 화면으로 돌아간다", () => {
  const completionDecision = getPostEditCompletionDecision();
  assert.deepEqual(
    completionDecision("activity_certification", "post-detail", true, 204),
    { action: "back" },
  );
  assert.deepEqual(
    completionDecision("activity_certification", ["post-detail"], true, 205),
    { action: "back" },
  );
});

test("직접 진입한 활동인증 수정은 관계없는 탐색 기록으로 돌아가지 않는다", () => {
  const completionDecision = getPostEditCompletionDecision();
  assert.deepEqual(
    completionDecision("activity_certification", undefined, true, 204),
    { action: "replace", route: "/board/post/204" },
  );
  assert.deepEqual(
    completionDecision("activity_certification", "post-detail", false, 204),
    { action: "replace", route: "/board/post/204" },
  );
});

test("상조회와 일반 게시글 수정 완료의 기존 상세 교체 동작을 유지한다", () => {
  const completionDecision = getPostEditCompletionDecision();
  assert.deepEqual(
    completionDecision("mutual_aid", "post-detail", true, 301),
    { action: "replace", route: "/board/post/301" },
  );
  assert.deepEqual(
    completionDecision("resource", "post-detail", true, 302),
    { action: "replace", route: "/board/post/302" },
  );
});

test("상조회 등 독립 게시판 글쓰기는 기존 뒤로가기와 직접 진입 대체 경로를 유지한다", () => {
  assert.equal(
    postCreateRouteFromBoardList(18, "", false, false, "/board/18"),
    "/board/post/create?boardId=18&category=",
  );
  assert.deepEqual(postCreateBackDecision(undefined, true, 18), { action: "back" });
  assert.deepEqual(postCreateBackDecision(undefined, false, 18), { action: "replace", route: "/board/18" });
});

test("활동 인증 글쓰기는 기존 전용 목록 복귀 분기를 유지한다", () => {
  assert.equal(
    postCreateRouteFromBoardList(12, "활동 인증", true, true, PARTICIPATION_TAB_ROUTE),
    postCreateRoute(12, "활동 인증"),
  );
});

test("글쓰기 복귀 경로로 외부 주소나 상세 화면을 허용하지 않는다", () => {
  assert.deepEqual(postCreateBackDecision("https://example.com", false, 18), { action: "replace", route: "/board/18" });
  assert.deepEqual(postCreateBackDecision("/board/post/645", true, 18), { action: "back" });
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
