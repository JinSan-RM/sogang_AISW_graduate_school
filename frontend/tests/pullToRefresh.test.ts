import assert from "node:assert/strict";
import test from "node:test";

import { mediaAccessQueryOptions } from "../hooks/useMediaAccessUrl";
import type { NoticeFilter } from "../utils/noticeFeed";
import {
  enabledRefetch,
  noticeRefreshControlRefreshing,
  refreshQueries,
  selectNoticeFilterAndRefresh,
} from "../utils/pullToRefresh";

test("보호 이미지 접근 URL 옵션은 캐시를 유지하고 주기 갱신을 예약하지 않는다", () => {
  const options = mediaAccessQueryOptions({ id: 71, url: "/uploads/profile.png" });

  assert.equal(options.staleTime, Infinity);
  assert.equal("refetchInterval" in options, false);
});

test("새로고침은 사용 가능한 모든 쿼리를 실행하고 개별 실패를 격리한다", async () => {
  const calls: string[] = [];

  await refreshQueries([
    async () => {
      calls.push("boards");
    },
    undefined,
    async () => {
      calls.push("notices");
      throw new Error("offline");
    },
    async () => {
      calls.push("events");
    },
  ]);

  assert.deepEqual(calls, ["boards", "notices", "events"]);
});

test("비활성 쿼리는 새로고침 대상에 포함하지 않는다", () => {
  const refetch = async () => undefined;

  assert.equal(enabledRefetch(false, refetch), undefined);
  assert.equal(enabledRefetch(true, refetch), refetch);
});

test("공지 초기 로딩 중에는 pull indicator를 LoadingRows와 함께 표시하지 않는다", () => {
  assert.equal(noticeRefreshControlRefreshing({
    boardsLoading: true,
    boardsRefetching: false,
    postsRefetching: false,
  }), false);
  assert.equal(noticeRefreshControlRefreshing({
    boardsLoading: false,
    boardsRefetching: true,
    postsRefetching: false,
  }), true);
  assert.equal(noticeRefreshControlRefreshing({
    boardsLoading: false,
    boardsRefetching: false,
    postsRefetching: true,
  }), true);
});

test("공지 필터 선택은 선택값과 쿼리 키를 바꾸고 이전 공지 쿼리는 재조회하지 않는다", async () => {
  for (const filter of ["all", "academic", "event", "other"] satisfies NoticeFilter[]) {
    let selected: NoticeFilter = "all";
    const calls: string[] = [];

    await (selectNoticeFilterAndRefresh as (
      filter: NoticeFilter,
      selectFilter: (filter: NoticeFilter) => void,
      refetchBoards: () => Promise<unknown>,
      oldPostRefetch: () => Promise<unknown>,
    ) => Promise<void>)(
      filter,
      (nextFilter) => {
        selected = nextFilter;
      },
      async () => {
        calls.push("boards");
      },
      async () => {
        calls.push("posts");
      },
    );

    assert.equal(selected, filter);
    assert.deepEqual(calls, ["boards"]);
  }
});
