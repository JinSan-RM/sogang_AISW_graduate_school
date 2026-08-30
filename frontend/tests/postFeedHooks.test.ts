import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { AxiosAdapter } from "axios";

import type { ApiSuccess, PostListItem } from "../types";
import { firstPostPageData } from "../utils/postFeedPagination";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "react-native") {
      return nextResolve("react-native-web", context);
    }
    if (specifier === "expo-secure-store" || specifier === "expo-constants") {
      return nextResolve("node:fs", context);
    }
    return nextResolve(specifier, context);
  },
});

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;

const modulesPromise = Promise.all([
  import("../services/api"),
  import("../hooks/usePosts"),
]);

type FeedParams = {
  scope: "notices" | "resources" | "council_activity";
  page: number;
  size: number;
  q?: string;
  notice_category?: "academic" | "event" | "other";
  sort?: "latest" | "popular" | "views";
  pin_priority?: boolean;
};

type PostHookContract = {
  boardPostInfiniteQueryOptions: (
    boardId: number,
    filters?: { q?: string; category?: string; status?: string; sort?: "latest" | "popular" | "views" },
    enabled?: boolean,
  ) => Record<string, unknown>;
  aggregatePostInfiniteQueryOptions: (
    scope: FeedParams["scope"],
    filters?: Omit<FeedParams, "scope" | "page" | "size">,
    enabled?: boolean,
  ) => Record<string, unknown>;
  refreshPostQueryFirstPage: (
    queryClient: QueryClient,
    queryKey: readonly unknown[],
    load: () => Promise<ApiSuccess<PostListItem[]>>,
    shouldCommit?: () => boolean,
  ) => Promise<void>;
  createPostFirstPageRefreshCoordinator: (
    onRefreshingChange: () => void,
  ) => {
    activate: (queryKey: readonly unknown[]) => void;
    run: (
      queryKey: readonly unknown[],
      task: (isLatest: () => boolean) => Promise<void>,
    ) => Promise<void>;
    runLoadMore: (
      queryKey: readonly unknown[],
      task: () => Promise<unknown>,
    ) => Promise<unknown> | undefined;
    isRefreshing: (queryKey: readonly unknown[]) => boolean;
    refreshError: (queryKey: readonly unknown[]) => Error | null;
  };
  postInfiniteItems: (data?: {
    pages: ApiSuccess<PostListItem[]>[];
    pageParams: number[];
  }) => PostListItem[];
  invalidatePostMutationCaches?: (
    queryClient: QueryClient,
    targets: {
      boardIds: readonly number[];
      feedScopes?: readonly FeedParams["scope"][];
      refreshHomeNotices?: boolean;
    },
  ) => Promise<void>;
  patchCachedPostListItem?: (
    queryClient: QueryClient,
    postId: number,
    patch: Partial<Pick<PostListItem, "like_count" | "comment_count">>,
  ) => void;
  invalidatePopularAggregatePostFeedCaches?: (
    queryClient: QueryClient,
    scopes?: readonly FeedParams["scope"][],
  ) => Promise<void>;
  invalidatePostLikeCaches?: (
    queryClient: QueryClient,
    boardId: number,
    board: { board_type?: string | null; category?: string | null; slug?: string | null } | null | undefined,
  ) => Promise<void>;
  postMutationCacheTargets?: (
    boardId: number,
    board?: { board_type?: string | null; category?: string | null; slug?: string | null } | null,
    options?: { refreshHomeNotices?: boolean },
  ) => {
    boardIds: readonly number[];
    feedScopes?: readonly FeedParams["scope"][];
    refreshHomeNotices?: boolean;
  };
};

async function modules() {
  const [{ api, postApi }, postHooks] = await modulesPromise;
  return {
    api,
    postApi,
    hooks: postHooks as unknown as PostHookContract,
  };
}

function post(id: number): PostListItem {
  return {
    id,
    board_id: 7,
    title: `게시글 ${id}`,
    content_preview: "내용",
    author_id: 1,
    author_nickname: "작성자",
    is_anonymous: false,
    is_pinned: false,
    is_notice: false,
    status: "published",
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    created_at: "2026-08-29T00:00:00Z",
  };
}

function page(currentPage: number, totalPages: number, items: PostListItem[]) {
  return {
    status: "success" as const,
    data: items,
    pagination: {
      page: currentPage,
      size: 20,
      total: totalPages * 20,
      total_pages: totalPages,
    },
  };
}

function responseAdapter(captured: { url?: string; params?: unknown }[]): AxiosAdapter {
  return async (config) => {
    captured.push({ url: config.url, params: config.params });
    return {
      config,
      data: page(1, 1, [post(1)]),
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("집계 피드 서비스는 scope와 필터를 /posts/feed 요청에 그대로 전달한다", async () => {
  const { api, postApi } = await modules();
  const captured: { url?: string; params?: unknown }[] = [];
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = responseAdapter(captured);

  const params: FeedParams = {
    scope: "notices",
    page: 3,
    size: 20,
    q: "장학금",
    notice_category: "academic",
    sort: "popular",
  };

  try {
    await (postApi as typeof postApi & { getFeed: (value: FeedParams) => Promise<unknown> }).getFeed(params);
  } finally {
    api.defaults.adapter = originalAdapter;
  }

  assert.deepEqual(captured, [{ url: "/posts/feed", params }]);
});

test("단일 게시판 쿼리 옵션은 기존 키를 보존하고 enabled와 페이지 요청을 적용한다", async () => {
  const { api, hooks } = await modules();
  const filters = { q: "프로젝트", category: "study", status: "published", sort: "latest" as const };
  const disabled = hooks.boardPostInfiniteQueryOptions(7, filters, false);
  const invalid = hooks.boardPostInfiniteQueryOptions(0, filters, true);
  const enabled = hooks.boardPostInfiniteQueryOptions(7, filters, true);

  assert.deepEqual(disabled.queryKey, ["posts", 7, filters]);
  assert.equal(disabled.enabled, false);
  assert.equal(invalid.enabled, false);
  assert.equal(enabled.enabled, true);

  const captured: { url?: string; params?: unknown }[] = [];
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = responseAdapter(captured);
  try {
    await (enabled.queryFn as (context: { pageParam: number }) => Promise<unknown>)({ pageParam: 4 });
  } finally {
    api.defaults.adapter = originalAdapter;
  }

  assert.deepEqual(captured, [{
    url: "/boards/7/posts",
    params: { page: 4, size: 20, ...filters },
  }]);
});

test("집계 쿼리 옵션은 scope별 키를 격리하고 feed 페이지 요청을 적용한다", async () => {
  const { api, hooks } = await modules();
  const filters = { q: "세미나", notice_category: "event" as const, sort: "views" as const };
  const disabled = hooks.aggregatePostInfiniteQueryOptions("notices", filters, false);
  const notices = hooks.aggregatePostInfiniteQueryOptions("notices", filters, true);
  const resources = hooks.aggregatePostInfiniteQueryOptions("resources", { q: "세미나", sort: "views" }, true);

  assert.deepEqual(notices.queryKey, ["posts", "feed", "notices", filters]);
  assert.notDeepEqual(notices.queryKey, resources.queryKey);
  assert.equal(disabled.enabled, false);
  assert.equal(notices.enabled, true);

  const captured: { url?: string; params?: unknown }[] = [];
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = responseAdapter(captured);
  try {
    await (notices.queryFn as (context: { pageParam: number }) => Promise<unknown>)({ pageParam: 2 });
  } finally {
    api.defaults.adapter = originalAdapter;
  }

  assert.deepEqual(captured, [{
    url: "/posts/feed",
    params: { scope: "notices", page: 2, size: 20, ...filters },
  }]);
});

test("첫 페이지 새로고침은 정확한 현재 키만 교체하고 실패 시 기존 캐시를 보존한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const currentKey = ["posts", "feed", "notices", { q: "장학금" }] as const;
  const siblingKey = ["posts", "feed", "notices", { q: "행사" }] as const;
  const oldCurrent = { pages: [page(1, 2, [post(1)]), page(2, 2, [post(2)])], pageParams: [1, 2] };
  const oldSibling = firstPostPageData(page(1, 1, [post(3)]));
  queryClient.setQueryData(currentKey, oldCurrent);
  queryClient.setQueryData(siblingKey, oldSibling);

  const fresh = page(1, 1, [post(4)]);
  await hooks.refreshPostQueryFirstPage(queryClient, currentKey, async () => fresh);

  assert.deepEqual(queryClient.getQueryData(currentKey), firstPostPageData(fresh));
  assert.deepEqual(queryClient.getQueryData(siblingKey), oldSibling);

  const beforeFailure = queryClient.getQueryData(currentKey);
  await assert.rejects(
    () => hooks.refreshPostQueryFirstPage(queryClient, currentKey, async () => {
      throw new Error("offline");
    }),
    { message: "offline" },
  );
  assert.strictEqual(queryClient.getQueryData(currentKey), beforeFailure);
});

test("공지 구조 mutation은 관련 게시판·공지 피드·홈 공지만 stale 처리하고 resources/events/albums는 보존한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const boardKey = ["posts", 7, { sort: "latest" }] as const;
  const aggregateKey = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const noticeFeedKey = ["posts", "feed", "notices", { sort: "latest" }] as const;
  const homeNoticeKey = ["home", "notices"] as const;
  const eventsKey = ["home", "events", "2026-08-01", "2026-08-31"] as const;
  const albumKey = ["home", "album", 11] as const;
  queryClient.setQueryData(boardKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(aggregateKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(noticeFeedKey, firstPostPageData(page(1, 1, [post(2)])));
  queryClient.setQueryData(homeNoticeKey, page(1, 1, [post(2)]));
  queryClient.setQueryData(eventsKey, { status: "success", data: [] });
  queryClient.setQueryData(albumKey, page(1, 1, [post(3)]));

  if (!hooks.invalidatePostMutationCaches) {
    assert.fail("invalidatePostMutationCaches must invalidate aggregate and Home notice caches");
  }
  await hooks.invalidatePostMutationCaches(queryClient, {
    boardIds: [7],
    feedScopes: ["notices"],
    refreshHomeNotices: true,
  });

  assert.equal(queryClient.getQueryState(boardKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(noticeFeedKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(homeNoticeKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(aggregateKey)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(eventsKey)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(albumKey)?.isInvalidated, false);
});

test("metadata 없는 structural mutation은 모든 aggregate와 Home 공지를 fallback stale 처리하지만 metadata가 있으면 기존 scope를 유지한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const boardKey = ["posts", 7, { sort: "latest" }] as const;
  const noticeFeedKey = ["posts", "feed", "notices", { sort: "latest" }] as const;
  const resourceFeedKey = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const councilFeedKey = ["posts", "feed", "council_activity", { sort: "latest" }] as const;
  const homeNoticeKey = ["home", "notices"] as const;
  const eventsKey = ["home", "events", "2026-08-01", "2026-08-31"] as const;
  queryClient.setQueryData(boardKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(noticeFeedKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(resourceFeedKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(councilFeedKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(homeNoticeKey, page(1, 1, [post(1)]));
  queryClient.setQueryData(eventsKey, { status: "success", data: [] });

  if (!hooks.postMutationCacheTargets || !hooks.invalidatePostMutationCaches) {
    assert.fail("structural mutations must expose scoped cache targets");
  }
  await hooks.invalidatePostMutationCaches(queryClient, hooks.postMutationCacheTargets(7, undefined));

  assert.equal(queryClient.getQueryState(boardKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(noticeFeedKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(resourceFeedKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(councilFeedKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(homeNoticeKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(eventsKey)?.isInvalidated, false);

  assert.deepEqual(
    hooks.postMutationCacheTargets(7, { category: "resources" }),
    { boardIds: [7], feedScopes: ["resources"], refreshHomeNotices: false },
  );
});

test("신고 댓글 삭제는 관련 공지 board와 feed만 stale 처리하고 Home 공지 미리보기는 보존한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const boardKey = ["posts", 7, { sort: "latest" }] as const;
  const noticeFeedKey = ["posts", "feed", "notices", { sort: "latest" }] as const;
  const councilFeedKey = ["posts", "feed", "council_activity", { sort: "latest" }] as const;
  const homeNoticeKey = ["home", "notices"] as const;
  queryClient.setQueryData(boardKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(noticeFeedKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(councilFeedKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(homeNoticeKey, page(1, 1, [post(1)]));

  if (!hooks.invalidatePostMutationCaches || !hooks.postMutationCacheTargets) {
    assert.fail("report-comment targets must use the scoped post mutation cache helpers");
  }
  const targets = hooks.postMutationCacheTargets(
    7,
    { board_type: "notice", category: "notices", slug: "academic-notices" },
    { refreshHomeNotices: false },
  );
  await hooks.invalidatePostMutationCaches(queryClient, targets);

  assert.equal(queryClient.getQueryState(boardKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(noticeFeedKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(councilFeedKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(homeNoticeKey)?.isInvalidated, false);
});

test("좋아요 결과는 같은 게시글이 든 board·aggregate 목록 캐시만 patch하고 네트워크 stale 처리를 하지 않는다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const boardKey = ["posts", 7, { sort: "latest" }] as const;
  const aggregateKey = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const siblingKey = ["posts", 8, { sort: "latest" }] as const;
  queryClient.setQueryData(boardKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(aggregateKey, firstPostPageData(page(1, 1, [post(1), post(2)])));
  queryClient.setQueryData(siblingKey, firstPostPageData(page(1, 1, [post(3)])));

  if (!hooks.patchCachedPostListItem) {
    assert.fail("patchCachedPostListItem must update matching cached list rows");
  }
  hooks.patchCachedPostListItem(queryClient, 1, { like_count: 9 });

  const boardItems = queryClient.getQueryData<InfiniteData<ApiSuccess<PostListItem[]>, number>>(boardKey)!;
  const aggregateItems = queryClient.getQueryData<InfiniteData<ApiSuccess<PostListItem[]>, number>>(aggregateKey)!;
  const siblingItems = queryClient.getQueryData<InfiniteData<ApiSuccess<PostListItem[]>, number>>(siblingKey)!;
  assert.equal(boardItems.pages[0].data[0].like_count, 9);
  assert.equal(aggregateItems.pages[0].data[0].like_count, 9);
  assert.equal(aggregateItems.pages[0].data[1].like_count, 0);
  assert.equal(siblingItems.pages[0].data[0].like_count, 0);
  assert.equal(queryClient.getQueryState(boardKey)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(aggregateKey)?.isInvalidated, false);
});

test("좋아요 뒤에는 인기순 aggregate만 stale 처리해 순서를 재평가하고 최신순 aggregate는 patch를 보존한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const latestKey = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const popularKey = ["posts", "feed", "resources", { sort: "popular" }] as const;
  const boardPopularKey = ["posts", 7, { sort: "popular" }] as const;
  queryClient.setQueryData(latestKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(popularKey, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(boardPopularKey, firstPostPageData(page(1, 1, [post(1)])));

  if (!hooks.invalidatePopularAggregatePostFeedCaches) {
    assert.fail("invalidatePopularAggregatePostFeedCaches must invalidate only popular aggregate feeds");
  }
  await hooks.invalidatePopularAggregatePostFeedCaches(queryClient);

  assert.equal(queryClient.getQueryState(latestKey)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(popularKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(boardPopularKey)?.isInvalidated, false);
});

test("좋아요는 board metadata의 aggregate popular scope와 정확한 Home popular만 stale 처리한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const resourcesPopular = ["posts", "feed", "resources", { sort: "popular" }] as const;
  const noticesPopular = ["posts", "feed", "notices", { sort: "popular" }] as const;
  const councilPopular = ["posts", "feed", "council_activity", { sort: "popular" }] as const;
  const resourcesLatest = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const homePopular = ["home", "popular", 7] as const;
  const siblingHomePopular = ["home", "popular", 8] as const;
  queryClient.setQueryData(resourcesPopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(noticesPopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(councilPopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(resourcesLatest, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(homePopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(siblingHomePopular, firstPostPageData(page(1, 1, [post(1)])));

  if (!hooks.invalidatePostLikeCaches) {
    assert.fail("invalidatePostLikeCaches must scope popular stale state using board metadata");
  }
  await hooks.invalidatePostLikeCaches(queryClient, 7, { category: "resources" });

  assert.equal(queryClient.getQueryState(resourcesPopular)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(homePopular)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(noticesPopular)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(councilPopular)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(resourcesLatest)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(siblingHomePopular)?.isInvalidated, false);
});

test("cold deep-link 좋아요는 board metadata가 없으면 모든 aggregate popular와 해당 Home popular를 보수적으로 stale 처리한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const resourcesPopular = ["posts", "feed", "resources", { sort: "popular" }] as const;
  const noticesPopular = ["posts", "feed", "notices", { sort: "popular" }] as const;
  const councilPopular = ["posts", "feed", "council_activity", { sort: "popular" }] as const;
  const resourcesLatest = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const homePopular = ["home", "popular", 7] as const;
  const siblingHomePopular = ["home", "popular", 8] as const;
  queryClient.setQueryData(resourcesPopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(noticesPopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(councilPopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(resourcesLatest, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(homePopular, firstPostPageData(page(1, 1, [post(1)])));
  queryClient.setQueryData(siblingHomePopular, firstPostPageData(page(1, 1, [post(1)])));

  if (!hooks.invalidatePostLikeCaches) {
    assert.fail("cold deep-link likes must conservatively invalidate popular feeds");
  }
  await hooks.invalidatePostLikeCaches(queryClient, 7, undefined);

  assert.equal(queryClient.getQueryState(resourcesPopular)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(noticesPopular)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(councilPopular)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(homePopular)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(resourcesLatest)?.isInvalidated, false);
  assert.equal(queryClient.getQueryState(siblingHomePopular)?.isInvalidated, false);
});

test("pull-to-refresh는 이미 시작된 raw query refetch가 새 첫 페이지를 덮지 못하게 취소한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const queryKey = ["posts", "feed", "notices", { notice_category: "academic" }] as const;
  const staleResponse = deferred<ApiSuccess<PostListItem[]>>();
  queryClient.setQueryData(queryKey, firstPostPageData(page(1, 1, [post(1)])));

  const background = queryClient.fetchQuery({
    queryKey,
    queryFn: () => staleResponse.promise,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const fresh = page(1, 1, [post(20)]);
  await hooks.refreshPostQueryFirstPage(queryClient, queryKey, async () => fresh);
  staleResponse.resolve(page(1, 1, [post(10)]));
  await background.catch(() => undefined);

  assert.deepEqual(queryClient.getQueryData(queryKey), firstPostPageData(fresh));
});

test("pull 중 늦게 시작한 같은 키 raw refetch도 first-page commit 직전에 취소한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const queryKey = ["posts", "feed", "notices", { notice_category: "event" }] as const;
  const freshResponse = deferred<ApiSuccess<PostListItem[]>>();
  const staleResponse = deferred<ApiSuccess<PostListItem[]>>();
  queryClient.setQueryData(queryKey, firstPostPageData(page(1, 1, [post(1)])));

  const refresh = hooks.refreshPostQueryFirstPage(queryClient, queryKey, () => freshResponse.promise);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const background = queryClient.fetchQuery({
    queryKey,
    queryFn: () => staleResponse.promise,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const fresh = page(1, 1, [post(20)]);
  freshResponse.resolve(fresh);
  await refresh;
  staleResponse.resolve(page(1, 1, [post(10)]));
  await background.catch(() => undefined);

  assert.deepEqual(queryClient.getQueryData(queryKey), firstPostPageData(fresh));
});

test("이미 superseded된 pull은 최신 pull 뒤에 시작된 같은 키 refetch를 취소하지 않는다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const queryKey = ["posts", "feed", "notices", { notice_category: "other" }] as const;
  const olderResponse = deferred<ApiSuccess<PostListItem[]>>();
  const newerResponse = deferred<ApiSuccess<PostListItem[]>>();
  const backgroundResponse = deferred<ApiSuccess<PostListItem[]>>();
  const coordinator = hooks.createPostFirstPageRefreshCoordinator(() => undefined);
  queryClient.setQueryData(queryKey, firstPostPageData(page(1, 1, [post(1)])));

  const older = coordinator.run(queryKey, (isLatest) =>
    hooks.refreshPostQueryFirstPage(queryClient, queryKey, () => olderResponse.promise, isLatest));
  const newer = coordinator.run(queryKey, (isLatest) =>
    hooks.refreshPostQueryFirstPage(queryClient, queryKey, () => newerResponse.promise, isLatest));
  newerResponse.resolve(page(1, 1, [post(20)]));
  await newer;

  const background = queryClient.fetchQuery({
    queryKey,
    queryFn: () => backgroundResponse.promise,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  olderResponse.resolve(page(1, 1, [post(10)]));
  await older;
  const backgroundResult = page(1, 1, [post(30)]);
  backgroundResponse.resolve(backgroundResult);
  await background;

  assert.deepEqual(queryClient.getQueryData(queryKey), backgroundResult);
});

test("무한 쿼리 items는 페이지 순서를 유지하며 중복 게시글을 제거한다", async () => {
  const { hooks } = await modules();
  const data = {
    pages: [
      page(1, 2, [post(1), post(2)]),
      page(2, 2, [post(2), post(3)]),
    ],
    pageParams: [1, 2],
  };

  assert.deepEqual(hooks.postInfiniteItems(data).map((item) => item.id), [1, 2, 3]);
  assert.deepEqual(hooks.postInfiniteItems(), []);
});

test("겹친 첫 페이지 새로고침은 모든 요청이 끝날 때까지 진행 중이며 최신 요청만 커밋한다", async () => {
  const { hooks } = await modules();

  for (const completionOrder of ["older-first", "newer-first"] as const) {
    const queryClient = new QueryClient();
    const queryKey = ["posts", "feed", "notices", { q: completionOrder }] as const;
    const initial = firstPostPageData(page(1, 1, [post(1)]));
    queryClient.setQueryData(queryKey, initial);
    const refreshingStates: boolean[] = [];
    let coordinator!: ReturnType<PostHookContract["createPostFirstPageRefreshCoordinator"]>;
    coordinator = hooks.createPostFirstPageRefreshCoordinator(() => {
      refreshingStates.push(coordinator.isRefreshing(queryKey));
    });
    const older = deferred<ApiSuccess<PostListItem[]>>();
    const newer = deferred<ApiSuccess<PostListItem[]>>();

    const olderRun = coordinator.run(queryKey, (isLatest) =>
      hooks.refreshPostQueryFirstPage(queryClient, queryKey, () => older.promise, isLatest));
    const newerRun = coordinator.run(queryKey, (isLatest) =>
      hooks.refreshPostQueryFirstPage(queryClient, queryKey, () => newer.promise, isLatest));

    assert.deepEqual(refreshingStates, [true]);

    if (completionOrder === "older-first") {
      older.resolve(page(1, 1, [post(10)]));
      await olderRun;
      assert.deepEqual(refreshingStates, [true]);
      assert.deepEqual(queryClient.getQueryData(queryKey), initial);

      newer.resolve(page(1, 1, [post(20)]));
      await newerRun;
    } else {
      newer.resolve(page(1, 1, [post(20)]));
      await newerRun;
      assert.deepEqual(refreshingStates, [true]);
      assert.deepEqual(queryClient.getQueryData(queryKey), firstPostPageData(page(1, 1, [post(20)])));

      older.resolve(page(1, 1, [post(10)]));
      await olderRun;
    }

    assert.deepEqual(refreshingStates, [true, false]);
    assert.deepEqual(queryClient.getQueryData(queryKey), firstPostPageData(page(1, 1, [post(20)])));
  }
});

test("서로 다른 키의 겹친 새로고침은 각각 커밋하고 표시기는 현재 키 상태만 반영한다", async () => {
  const { hooks } = await modules();

  for (const completionOrder of ["a-first", "b-first"] as const) {
    const queryClient = new QueryClient();
    const keyA = ["posts", "feed", "notices", { q: "A" }] as const;
    const keyB = ["posts", "feed", "notices", { q: "B" }] as const;
    const initialA = firstPostPageData(page(1, 1, [post(1)]));
    const initialB = firstPostPageData(page(1, 1, [post(2)]));
    queryClient.setQueryData(keyA, initialA);
    queryClient.setQueryData(keyB, initialB);
    let currentKey: readonly unknown[] = keyA;
    const currentIndicatorStates: boolean[] = [];
    let coordinator!: ReturnType<PostHookContract["createPostFirstPageRefreshCoordinator"]>;
    coordinator = hooks.createPostFirstPageRefreshCoordinator(() => {
      currentIndicatorStates.push(coordinator.isRefreshing(currentKey));
    });
    const loadA = deferred<ApiSuccess<PostListItem[]>>();
    const loadB = deferred<ApiSuccess<PostListItem[]>>();

    const runA = coordinator.run(keyA, (isLatest) =>
      hooks.refreshPostQueryFirstPage(queryClient, keyA, () => loadA.promise, isLatest));
    assert.equal(coordinator.isRefreshing(currentKey), true);

    currentKey = keyB;
    assert.equal(coordinator.isRefreshing(currentKey), false);
    const runB = coordinator.run(keyB, (isLatest) =>
      hooks.refreshPostQueryFirstPage(queryClient, keyB, () => loadB.promise, isLatest));
    assert.equal(coordinator.isRefreshing(currentKey), true);

    if (completionOrder === "a-first") {
      loadA.resolve(page(1, 1, [post(10)]));
      await runA;
      assert.equal(coordinator.isRefreshing(currentKey), true);
      assert.deepEqual(queryClient.getQueryData(keyA), firstPostPageData(page(1, 1, [post(10)])));

      loadB.resolve(page(1, 1, [post(20)]));
      await runB;
    } else {
      loadB.resolve(page(1, 1, [post(20)]));
      await runB;
      assert.equal(coordinator.isRefreshing(currentKey), false);
      assert.deepEqual(queryClient.getQueryData(keyB), firstPostPageData(page(1, 1, [post(20)])));

      loadA.resolve(page(1, 1, [post(10)]));
      await runA;
    }

    assert.equal(coordinator.isRefreshing(currentKey), false);
    assert.deepEqual(queryClient.getQueryData(keyA), firstPostPageData(page(1, 1, [post(10)])));
    assert.deepEqual(queryClient.getQueryData(keyB), firstPostPageData(page(1, 1, [post(20)])));
    assert.equal(currentIndicatorStates.at(-1), false);
  }
});

test("같은 키의 즉시 중복 다음 페이지 호출은 동기 래치로 한 번만 실행한다", async () => {
  const { hooks } = await modules();
  const queryKey = ["posts", 7, { sort: "latest" }] as const;
  const completion = deferred<void>();
  let calls = 0;
  const coordinator = hooks.createPostFirstPageRefreshCoordinator(() => undefined);

  const first = coordinator.runLoadMore(queryKey, async () => {
    calls += 1;
    await completion.promise;
  });
  const duplicate = coordinator.runLoadMore(queryKey, async () => {
    calls += 1;
  });

  assert.ok(first);
  assert.equal(duplicate, undefined);
  assert.equal(calls, 1);

  completion.resolve();
  await first;
  await coordinator.runLoadMore(queryKey, async () => {
    calls += 1;
  });
  assert.equal(calls, 2);
});

test("진행 중인 다음 페이지가 끝난 뒤 새 첫 페이지를 커밋하고 새로고침 중 추가 로딩을 차단한다", async () => {
  const { hooks } = await modules();
  const queryClient = new QueryClient();
  const queryKey = ["posts", "feed", "resources", { sort: "latest" }] as const;
  const initial = firstPostPageData(page(1, 3, [post(1)]));
  queryClient.setQueryData(queryKey, initial);
  const loadMoreCompletion = deferred<void>();
  const refreshCompletion = deferred<ApiSuccess<PostListItem[]>>();
  const events: string[] = [];
  const coordinator = hooks.createPostFirstPageRefreshCoordinator(() => undefined);

  const loadMore = coordinator.runLoadMore(queryKey, async () => {
    events.push("next:start");
    await loadMoreCompletion.promise;
    events.push("next:commit");
    queryClient.setQueryData(queryKey, {
      pages: [page(1, 3, [post(1)]), page(2, 3, [post(2)])],
      pageParams: [1, 2],
    });
  });
  const refresh = coordinator.run(queryKey, (isLatest) => {
    events.push("refresh:start");
    return hooks.refreshPostQueryFirstPage(
      queryClient,
      queryKey,
      () => refreshCompletion.promise,
      isLatest,
    );
  });
  const deniedDuringRefresh = coordinator.runLoadMore(queryKey, async () => {
    events.push("next:unexpected");
  });

  assert.ok(loadMore);
  assert.equal(deniedDuringRefresh, undefined);
  assert.deepEqual(events, ["next:start"]);

  loadMoreCompletion.resolve();
  await loadMore;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, ["next:start", "next:commit", "refresh:start"]);

  const fresh = page(1, 3, [post(10)]);
  refreshCompletion.resolve(fresh);
  await refresh;
  assert.deepEqual(queryClient.getQueryData(queryKey), firstPostPageData(fresh));
});

test("첫 페이지 새로고침 오류는 소비되어 키별로 노출되고 재시도·키 변경에서 해제된다", async () => {
  const { hooks } = await modules();
  const keyA = ["posts", "feed", "notices", { notice_category: "academic" }] as const;
  const keyB = ["posts", "feed", "notices", { notice_category: "event" }] as const;
  const coordinator = hooks.createPostFirstPageRefreshCoordinator(() => undefined);

  coordinator.activate(keyA);
  await coordinator.run(keyA, async () => {
    throw new Error("refresh offline");
  });
  assert.equal(coordinator.refreshError(keyA)?.message, "refresh offline");

  await coordinator.run(keyA, async () => undefined);
  assert.equal(coordinator.refreshError(keyA), null);

  await coordinator.run(keyA, async () => {
    throw new Error("stale key error");
  });
  coordinator.activate(keyB);
  assert.equal(coordinator.refreshError(keyB), null);
  coordinator.activate(keyA);
  assert.equal(coordinator.refreshError(keyA), null);
});
