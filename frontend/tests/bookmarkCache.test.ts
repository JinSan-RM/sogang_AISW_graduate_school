import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import * as postDetailCache from "../utils/postDetailCache";
import { applyBookmarkResult } from "../utils/postDetailCache";

type PostDetailFocusDecision = {
  nextFocusedPostId: number;
  shouldRefetch: boolean;
};

const focusDecision = (previousFocusedPostId: number | null, postId: number) =>
  (
    postDetailCache as typeof postDetailCache & {
      postDetailFocusDecision?: (
        previousFocusedPostId: number | null,
        postId: number,
      ) => PostDetailFocusDecision;
    }
  ).postDetailFocusDecision?.(previousFocusedPostId, postId);

test("스크랩 결과는 상세 캐시만 갱신하고 조회수 증가 GET을 유발할 무효화를 하지 않는다", () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["post", 42], {
    status: "success",
    data: { id: 42, is_bookmarked: false, view_count: 7 },
  });

  applyBookmarkResult(queryClient, 42, true);

  assert.deepEqual(queryClient.getQueryData(["post", 42]), {
    status: "success",
    data: { id: 42, is_bookmarked: true, view_count: 7 },
  });
  assert.equal(queryClient.getQueryState(["post", 42])?.isInvalidated, false);
});

test("상세 화면 최초 포커스는 최초 조회 요청에 추가 재조회를 겹치지 않는다", () => {
  assert.deepEqual(focusDecision(null, 42), {
    nextFocusedPostId: 42,
    shouldRefetch: false,
  });
});

test("같은 상세 화면 재진입은 조회수를 갱신하도록 한 번 재조회한다", () => {
  assert.deepEqual(focusDecision(42, 42), {
    nextFocusedPostId: 42,
    shouldRefetch: true,
  });
});

test("재사용된 화면의 게시글 ID가 바뀌면 새 쿼리의 최초 조회를 사용한다", () => {
  assert.deepEqual(focusDecision(42, 43), {
    nextFocusedPostId: 43,
    shouldRefetch: false,
  });
});
