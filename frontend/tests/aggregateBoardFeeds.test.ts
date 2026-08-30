import assert from "node:assert/strict";
import test from "node:test";

import {
  boardFeedFooterState,
  boardFeedMode,
  boardFeedQueryEnabled,
  canLoadNextBoardFeedPage,
  selectActiveBoardFeed,
} from "../utils/aggregateBoardFeeds";

test("화면 상태는 자료 전체, 원우회 활동, 단일 게시판 중 정확한 피드 모드를 선택한다", () => {
  assert.equal(
    boardFeedMode({ boardType: "resource", boardSlug: "lecture-reviews", selectedFilter: "전체" }),
    "resources",
  );
  assert.equal(
    boardFeedMode({ boardType: "resource", boardSlug: "exam-archive", selectedFilter: "시험족보" }),
    "board",
  );
  assert.equal(
    boardFeedMode({ boardType: "post", boardSlug: "council-activity", selectedFilter: "전체" }),
    "council_activity",
  );
  assert.equal(
    boardFeedMode({ boardType: "post", boardSlug: "gsa-activity", selectedFilter: "전체" }),
    "council_activity",
  );
  assert.equal(
    boardFeedMode({ boardType: "post", boardSlug: "community-major", selectedFilter: "전체" }),
    "board",
  );
});

test("선택된 모드의 쿼리만 활성화한다", () => {
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

  assert.equal(selectActiveBoardFeed("board", feeds), feeds.board);
  assert.equal(selectActiveBoardFeed("resources", feeds), feeds.resources);
  assert.equal(selectActiveBoardFeed("council_activity", feeds), feeds.councilActivity);
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
