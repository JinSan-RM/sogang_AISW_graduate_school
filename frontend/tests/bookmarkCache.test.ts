import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import { applyBookmarkResult } from "../utils/postDetailCache";

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
