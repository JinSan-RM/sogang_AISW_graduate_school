import assert from "node:assert/strict";
import test from "node:test";

import {
  boardFeedFooterState,
  boardFeedMode,
  boardFeedQueryEnabled,
  canLoadNextBoardFeedPage,
  createBoardFeedController,
  selectActiveBoardFeed,
} from "../utils/aggregateBoardFeeds";

test("집계 화면의 콜드 마운트는 메타데이터와 필터 소유권이 모두 준비될 때까지 대기한다", () => {
  const unresolvedMode = boardFeedMode({
    activeBoardId: 7,
    resolvedBoard: null,
    filterOwnerBoardId: null,
    selectedFilter: "전체",
  });
  const metadataOnlyMode = boardFeedMode({
    activeBoardId: 7,
    resolvedBoard: { id: 7, boardType: "resource", boardSlug: "lecture-reviews" },
    filterOwnerBoardId: null,
    selectedFilter: "전체",
  });

  assert.equal(unresolvedMode, "pending");
  assert.equal(metadataOnlyMode, "pending");
  assert.deepEqual(boardFeedQueryEnabled(unresolvedMode), {
    board: false,
    resources: false,
    councilActivity: false,
  });
});

test("캐시된 개별 자료 게시판도 현재 필터가 그 게시판에 동기화되기 전에는 대기한다", () => {
  assert.equal(
    boardFeedMode({
      activeBoardId: 7,
      resolvedBoard: { id: 7, boardType: "resource", boardSlug: "exam-archive" },
      filterOwnerBoardId: null,
      selectedFilter: "전체",
    }),
    "pending",
  );
});

test("게시판 전환 중에는 이전 필터 소유자의 피드를 숨기고 동기화 후 새 단일 피드를 선택한다", () => {
  assert.equal(
    boardFeedMode({
      activeBoardId: 7,
      resolvedBoard: { id: 7, boardType: "resource", boardSlug: "lecture-reviews" },
      filterOwnerBoardId: 7,
      selectedFilter: "전체",
    }),
    "resources",
  );
  assert.equal(
    boardFeedMode({
      activeBoardId: 8,
      resolvedBoard: { id: 8, boardType: "resource", boardSlug: "exam-archive" },
      filterOwnerBoardId: 7,
      selectedFilter: "전체",
    }),
    "pending",
  );
  assert.equal(
    boardFeedMode({
      activeBoardId: 8,
      resolvedBoard: { id: 8, boardType: "resource", boardSlug: "exam-archive" },
      filterOwnerBoardId: 8,
      selectedFilter: "시험족보",
    }),
    "board",
  );
});

test("메타데이터와 필터 소유자가 현재 게시판과 일치할 때만 정확한 피드를 선택한다", () => {
  assert.equal(
    boardFeedMode({
      activeBoardId: 7,
      resolvedBoard: { id: 7, boardType: "resource", boardSlug: "exam-archive" },
      filterOwnerBoardId: 7,
      selectedFilter: "시험족보",
    }),
    "board",
  );
  assert.equal(
    boardFeedMode({
      activeBoardId: 7,
      resolvedBoard: { id: 7, boardType: "resource", boardSlug: "lecture-reviews" },
      filterOwnerBoardId: 7,
      selectedFilter: "전체",
    }),
    "resources",
  );
  assert.equal(
    boardFeedMode({
      activeBoardId: 9,
      resolvedBoard: { id: 9, boardType: "post", boardSlug: "council-activity" },
      filterOwnerBoardId: 9,
      selectedFilter: "전체",
    }),
    "council_activity",
  );
  assert.equal(
    boardFeedMode({
      activeBoardId: 10,
      resolvedBoard: { id: 10, boardType: "post", boardSlug: "gsa-activity" },
      filterOwnerBoardId: 10,
      selectedFilter: "전체",
    }),
    "council_activity",
  );
  assert.equal(
    boardFeedMode({
      activeBoardId: 11,
      resolvedBoard: { id: 11, boardType: "post", boardSlug: "community-major" },
      filterOwnerBoardId: 11,
      selectedFilter: "전체",
    }),
    "board",
  );
});

test("선택된 모드의 쿼리만 활성화한다", () => {
  assert.deepEqual(boardFeedQueryEnabled("pending"), {
    board: false,
    resources: false,
    councilActivity: false,
  });
  assert.deepEqual(boardFeedQueryEnabled("board"), {
    board: true,
    resources: false,
    councilActivity: false,
  });
  assert.deepEqual(boardFeedQueryEnabled("resources"), {
    board: false,
    resources: true,
    councilActivity: false,
  });
  assert.deepEqual(boardFeedQueryEnabled("council_activity"), {
    board: false,
    resources: false,
    councilActivity: true,
  });
});

test("목록 상태와 동작은 현재 모드의 쿼리만 사용한다", () => {
  const feeds = {
    board: { name: "board", items: [1] },
    resources: { name: "resources", items: [2] },
    councilActivity: { name: "council", items: [3] },
  };

  assert.equal(selectActiveBoardFeed("pending", feeds), null);
  assert.equal(selectActiveBoardFeed("board", feeds), feeds.board);
  assert.equal(selectActiveBoardFeed("resources", feeds), feeds.resources);
  assert.equal(selectActiveBoardFeed("council_activity", feeds), feeds.councilActivity);
});

test("새로고침, 다음 페이지, 재시도는 선택된 피드에만 위임한다", () => {
  for (const [mode, selectedName] of [
    ["board", "board"],
    ["resources", "resources"],
    ["council_activity", "council"],
  ] as const) {
    const calls: string[] = [];
    const feed = (name: string) => ({
      name,
      hasNextPage: true,
      isFetchingNextPage: false,
      refreshFirstPage: () => calls.push(`${name}:refresh`),
      fetchNextPage: () => calls.push(`${name}:load-more`),
      refetch: () => calls.push(`${name}:retry`),
    });
    const feeds = {
      board: feed("board"),
      resources: feed("resources"),
      councilActivity: feed("council"),
    };
    const controller = createBoardFeedController(mode, feeds);

    controller.refreshFirstPage();
    controller.loadMore();
    controller.retry();

    assert.equal(controller.query, feeds[mode === "council_activity" ? "councilActivity" : mode]);
    assert.deepEqual(calls, [
      `${selectedName}:refresh`,
      `${selectedName}:load-more`,
      `${selectedName}:retry`,
    ]);
  }
});

test("대기 중인 화면은 이전 피드 상태나 동작을 위임하지 않는다", () => {
  const calls: string[] = [];
  const feed = (name: string) => ({
    hasNextPage: true,
    isFetchingNextPage: false,
    refreshFirstPage: () => calls.push(`${name}:refresh`),
    fetchNextPage: () => calls.push(`${name}:load-more`),
    refetch: () => calls.push(`${name}:retry`),
  });
  const controller = createBoardFeedController("pending", {
    board: feed("board"),
    resources: feed("resources"),
    councilActivity: feed("council"),
  });

  controller.refreshFirstPage();
  controller.loadMore();
  controller.retry();

  assert.equal(controller.query, null);
  assert.deepEqual(calls, []);
});

test("다음 페이지는 다음 데이터가 있고 기존 요청이 끝난 뒤에만 불러온다", () => {
  assert.equal(canLoadNextBoardFeedPage({ hasNextPage: true, isFetchingNextPage: false }), true);
  assert.equal(canLoadNextBoardFeedPage({ hasNextPage: false, isFetchingNextPage: false }), false);
  assert.equal(canLoadNextBoardFeedPage({ hasNextPage: true, isFetchingNextPage: true }), false);
});

test("피드 하단은 다음 페이지의 로딩과 재시도 상태를 구분한다", () => {
  assert.equal(
    boardFeedFooterState({ isFetchingNextPage: true, isFetchNextPageError: false }),
    "loading",
  );
  assert.equal(
    boardFeedFooterState({ isFetchingNextPage: false, isFetchNextPageError: true }),
    "retry",
  );
  assert.equal(
    boardFeedFooterState({ isFetchingNextPage: false, isFetchNextPageError: false }),
    "idle",
  );
});
