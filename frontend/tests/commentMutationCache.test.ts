import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import type { ReactNode } from "react";
import { InfiniteQueryObserver, QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import type { AxiosAdapter } from "axios";

import type { ApiSuccess, PostListItem } from "../types";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "react-native") return nextResolve("react-native-web", context);
    if (specifier === "expo-secure-store" || specifier === "expo-constants") {
      return nextResolve("node:fs", context);
    }
    return nextResolve(specifier, context);
  },
});
(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;

const modules = Promise.all([import("../services/api"), import("../hooks/usePosts")]);
// The app includes React DOM for web, but does not ship its optional server types.
const { renderToString } = createRequire(import.meta.url)("react-dom/server") as {
  renderToString: (element: ReactNode) => string;
};

function renderHook<T>(queryClient: QueryClient, hook: () => T): T {
  let result!: T;
  function Harness() {
    result = hook();
    return null;
  }
  renderToString(createElement(QueryClientProvider, { client: queryClient }, createElement(Harness)));
  return result;
}

function post(commentCount: number): PostListItem {
  return {
    id: 42, board_id: 7, title: "댓글 갱신 확인", content_preview: "내용",
    author_id: 1, author_nickname: "작성자", is_anonymous: false,
    is_pinned: false, is_notice: false, status: "published",
    view_count: 10, like_count: 2, comment_count: commentCount,
    created_at: "2026-09-10T00:00:00Z",
  };
}

function page(pageNumber: number, commentCount: number): ApiSuccess<PostListItem[]> {
  return {
    status: "success",
    data: [pageNumber === 2 ? post(commentCount) : { ...post(8), id: 41 }],
    pagination: { page: pageNumber, size: 1, total: 2, total_pages: 2 },
  };
}

for (const scenario of [
  { name: "마지막 댓글 삭제 후 뒤로가기", before: 1, after: 0, action: "delete" },
  { name: "답글이 있는 부모 댓글 삭제 후 뒤로가기", before: 4, after: 1, action: "delete" },
  { name: "댓글 등록 후 뒤로가기", before: 0, after: 1, action: "create" },
] as const) {
  test(`${scenario.name}: 열려 있는 목록의 서버 댓글 수와 페이지·필터를 보존한다`, async () => {
    const [{ api, postApi }, hooks] = await modules;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const filters = { q: "댓글", sort: "latest" as const };
    const boardKey = ["posts", 7, filters] as const;
    const aggregateKey = ["posts", "feed", "resources", filters] as const;
    const initialData = { pages: [page(1, scenario.before), page(2, scenario.before)], pageParams: [1, 2] };
    let serverCount: number = scenario.before;
    const originalAdapter = api.defaults.adapter;
    const adapter: AxiosAdapter = async (config) => {
      if (config.method === "delete" || config.method === "post") serverCount = scenario.after;
      return {
        config, headers: {}, status: 200, statusText: "OK",
        data: config.method === "get"
          ? page(Number(config.params?.page ?? 1), serverCount)
          : { status: "success", data: { id: 99, deleted_count: scenario.before - scenario.after } },
      };
    };
    api.defaults.adapter = adapter;
    const boardObserver = new InfiniteQueryObserver(queryClient, {
      queryKey: boardKey, initialData, initialPageParam: 1,
      getNextPageParam: () => 2,
      queryFn: ({ pageParam }) => postApi.getPosts(7, pageParam, 1, filters),
    });
    const aggregateObserver = new InfiniteQueryObserver(queryClient, {
      queryKey: aggregateKey, initialData, initialPageParam: 1,
      getNextPageParam: () => 2,
      queryFn: ({ pageParam }) => postApi.getFeed({ scope: "resources", page: pageParam, size: 1, ...filters }),
    });
    const unsubscribers = [boardObserver.subscribe(() => {}), aggregateObserver.subscribe(() => {})];
    try {
      if (scenario.action === "delete") {
        await renderHook(queryClient, () => hooks.useDeleteComment(42)).mutateAsync(99);
      } else {
        await renderHook(queryClient, () => hooks.useCreateComment(42)).mutateAsync({ content: "새 댓글" });
      }
      for (const observer of [boardObserver, aggregateObserver]) {
        const data = observer.getCurrentResult().data!;
        assert.equal(data.pages[1].data[0].comment_count, scenario.after);
        assert.deepEqual(data.pageParams, [1, 2]);
        assert.equal(data.pages[0].data[0].comment_count, 8);
        assert.equal(data.pages[1].data[0].like_count, 2);
      }
      assert.deepEqual(queryClient.getQueryCache().find({ queryKey: boardKey })?.queryKey, boardKey);
    } finally {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      queryClient.clear();
      api.defaults.adapter = originalAdapter;
    }
  });
}

test("댓글 삭제는 홈·다중 게시판·내 활동·관리자 목록을 갱신하고 비활성 목록도 stale 처리한다", async () => {
  const [{ api }, hooks] = await modules;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const keys = [["home", "popular", 7], ["multi-board-posts", [7]], ["activity", "posts"], ["activity", "comments"], ["activity", "bookmarks"], ["admin-posts", "dashboard"], ["admin-posts", "", 7]];
  let deleted = false;
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    deleted = true;
    return { config, headers: {}, status: 200, statusText: "OK", data: { status: "success", data: { id: 99, deleted_count: 1 } } };
  };
  const observers = keys.map((queryKey) => new QueryObserver(queryClient, {
    queryKey, initialData: { status: "success", data: [post(1)] },
    queryFn: async () => ({ status: "success", data: queryKey[1] === "comments" && deleted ? [] : [post(deleted ? 0 : 1)] }),
  }));
  const unsubscribers = observers.map((observer) => observer.subscribe(() => {}));
  const inactiveKeys = [["posts", 8], ["post", 42], ["comments", 42], ["admin-stats"]];
  inactiveKeys.forEach((key) => queryClient.setQueryData(key, { status: "success", data: [] }));
  queryClient.setQueryData(["home", "events"], { status: "success", data: [] });
  queryClient.setQueryData(["post", 43], { status: "success", data: post(3) });
  try {
    await renderHook(queryClient, () => hooks.useDeleteComment(42)).mutateAsync(99);
    for (const [index, observer] of observers.entries()) {
      const rows = observer.getCurrentResult().data!.data;
      if (keys[index][1] === "comments") assert.equal(rows.length, 0);
      else assert.equal(rows[0].comment_count, 0);
    }
    inactiveKeys.forEach((key) => assert.equal(queryClient.getQueryState(key)?.isInvalidated, true));
    assert.equal(queryClient.getQueryState(["home", "events"])?.isInvalidated, false);
    assert.equal(queryClient.getQueryState(["post", 43])?.isInvalidated, false);
  } finally {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    queryClient.clear();
    api.defaults.adapter = originalAdapter;
  }
});

test("댓글 삭제 API가 실패하면 목록의 댓글 수를 바꾸지 않는다", async () => {
  const [{ api }, hooks] = await modules;
  const queryClient = new QueryClient();
  const key = ["posts", 7];
  queryClient.setQueryData(key, { pages: [page(2, 1)], pageParams: [2] });
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async () => { throw new Error("댓글 삭제 실패"); };
  try {
    await assert.rejects(renderHook(queryClient, () => hooks.useDeleteComment(42)).mutateAsync(99), /댓글 삭제 실패/);
    assert.deepEqual(queryClient.getQueryData(key), { pages: [page(2, 1)], pageParams: [2] });
    assert.equal(queryClient.getQueryState(key)?.isInvalidated, false);
  } finally {
    queryClient.clear();
    api.defaults.adapter = originalAdapter;
  }
});
