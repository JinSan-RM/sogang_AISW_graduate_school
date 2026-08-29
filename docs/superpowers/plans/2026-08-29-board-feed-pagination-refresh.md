# Board Feed Pagination and Pull-to-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load user-facing post feeds 20 items at a time, paginate aggregate notice/resource/council-activity feeds correctly, and refresh only the active first page without changing existing navigation behavior.

**Architecture:** Keep the existing single-board `page/size` endpoint and add one server-side aggregate `/posts/feed` endpoint for cross-board feeds. React Query owns all accumulated pages; a small pure utility handles next-page validation, ID deduplication, and atomic first-page replacement. Existing Expo Router routes, `returnTo`, tab reset revisions, and back handlers are left untouched.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, PostgreSQL/SQLite tests, React Native, Expo Router, TanStack React Query v5, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-29-board-feed-pagination-refresh-design.md`

## Global Constraints

- Initial post feed size is exactly `20`; backend maximum remains `100`.
- API responses retain `{status,data,pagination:{page,size,total,total_pages}}`.
- Do not change Back, Android hardware Back, browser Back, `returnTo`, cross-tab navigation, or `tabRootResetStore`.
- Explicit bottom-tab presses continue resetting Notices, Community, and Participation through the existing revision keys.
- Pull-to-refresh preserves the active board, filter, committed query, and sort; old rows stay visible until the first-page request succeeds.
- Do not introduce a new dependency or persist feed rows outside React Query.
- Preserve unrelated tracked and untracked user work.
- Every implementation task follows red-green-refactor TDD and commits only its own files.

---

### Task 1: Aggregate Post Feed API

**Files:**
- Create: `backend/tests/test_post_feed.py`
- Modify: `backend/app/routers/posts.py:286-452`
- Modify: `docs/phase2/API_CONTRACT.md:760-803`

**Interfaces:**
- Consumes: existing `post_status_read_filter`, author/privacy helpers, attachment thumbnail query, and `success_response`.
- Produces: `GET /api/posts/feed?scope=&page=&size=&q=&notice_category=&sort=` returning the normal `PostListItem[]` envelope.
- Produces: shared deterministic `_post_list_order(sort)` and `_serialize_post_list_item` helpers while leaving the existing single-board count/query shape intact.

- [ ] **Step 1: Write failing pagination and scope tests**

Create API tests that insert active notice/resource/activity-history boards and posts across at least two boards. The core assertion shape is:

```python
def test_resource_feed_paginates_across_boards_in_one_global_order(api) -> None:
    seeded = seed_feed_posts(api, scope="resources", count=25)

    first = api.client.get(
        "/api/posts/feed",
        params={"scope": "resources", "page": 1, "size": 20, "sort": "latest"},
        headers=api.headers["owner"],
    )
    second = api.client.get(
        "/api/posts/feed",
        params={"scope": "resources", "page": 2, "size": 20, "sort": "latest"},
        headers=api.headers["owner"],
    )

    assert first.status_code == 200
    assert first.json()["pagination"] == {"page": 1, "size": 20, "total": 25, "total_pages": 2}
    ids = [item["id"] for item in first.json()["data"] + second.json()["data"]]
    assert ids == seeded
    assert len(ids) == len(set(ids)) == 25
```

Also add independent tests with these exact names and assertions:

- `test_notice_feed_filters_academic_event_and_other`: seed one post for each filter plus a calendar-board post; assert each filter returns only its matching post and never the calendar post.
- `test_council_activity_feed_includes_linked_notices_and_legacy_activity_posts`: seed one linked notice, one unlinked notice, and one legacy activity-board post; assert only the linked notice and legacy post are returned.
- `test_feed_excludes_unreadable_deleted_and_blocked_author_posts`: seed one visible post, one soft-deleted post, one hidden post by another user, and one post by a blocked user; assert only the visible post remains.
- `test_feed_rejects_unknown_scope_and_invalid_notice_filter`: assert invalid scope/filter values return `422`, and a valid notice filter sent to `resources` also returns normalized `422`.
- `test_popular_and_views_use_id_as_final_tie_breaker`: seed equal metrics and timestamps with known IDs; assert both sort modes return descending IDs.

- [ ] **Step 2: Run the focused backend test and confirm red**

Run:

```powershell
python -m pytest tests/test_post_feed.py -q
```

Expected: requests to `/api/posts/feed` fail because the route does not exist.

- [ ] **Step 3: Add shared deterministic order and feed scope predicates**

In `posts.py`, extract the current order selection so both single-board and aggregate lists use the same final ID tie-breaker:

```python
def _post_list_order(sort: str):
    if sort == "popular":
        return (
            Post.is_pinned.desc(),
            Post.like_count.desc(),
            Post.comment_count.desc(),
            Post.created_at.desc(),
            Post.id.desc(),
        )
    if sort == "views":
        return (
            Post.is_pinned.desc(),
            Post.view_count.desc(),
            Post.created_at.desc(),
            Post.id.desc(),
        )
    return (Post.is_pinned.desc(), Post.created_at.desc(), Post.id.desc())
```

Add a scope helper with exact predicates:

```python
def _post_feed_scope_filter(scope: str):
    if scope == "notices":
        return Board.board_type == "notice"
    if scope == "resources":
        return Board.category == "resources"
    return or_(
        Board.slug.in_(["council-activity", "gsa-activity"]),
        and_(
            Board.board_type == "notice",
            Post.metadata_json["show_in_council_activity"].as_boolean().is_(True),
        ),
    )
```

The notice-category helper must use the same academic/event/other mapping already implemented for notice search, while excluding calendar boards through `Board.board_type == "notice"`.

Extract only the existing per-row dictionary construction into `_serialize_post_list_item`. Its arguments are `db`, `post`, the actual `Board` model, live nickname/cohort, attachment count, thumbnail ID/URL, `current_user`, `q`, and an optional activity-source title. Its return value retains every existing `PostListItem` field and privacy helper. The single-board endpoint keeps its current count and page query and calls this serializer; the aggregate endpoint selects the actual `Board` row and calls the same serializer. This avoids changing the proven single-board SQL path.

Implement these private helper contracts before the route:

- `_post_feed_notice_filters(scope, notice_category)` returns no predicate when the category is absent, returns the existing academic/event/other predicate for `notices`, and raises normalized `VALIDATION_ERROR` when a category is supplied for another scope.
- `_post_feed_search_filter(q, current_user)` returns no predicate when `q` is absent; otherwise it searches title/body plus author only for non-anonymous posts on boards that do not hide identity.
- `_post_feed_block_filter(db, current_user)` returns no predicate when the user has no blocks; otherwise it keeps anonymous posts and forced-anonymous-board posts while excluding identified posts from blocked authors.
- `_post_attachment_subqueries()` returns the existing attachment-count and first-ready-image subqueries so both list paths use identical media fields.

- [ ] **Step 4: Implement `GET /posts/feed`**

Define the static route before `GET /posts/{post_id}`:

```python
@router.get("/posts/feed")
def get_post_feed(
    scope: str = Query(pattern="^(notices|resources|council_activity)$"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, min_length=1),
    notice_category: str | None = Query(None, pattern="^(academic|event|other)$"),
    sort: str = Query("latest", pattern="^(latest|popular|views)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filters = [
        Board.is_active.is_(True),
        Post.deleted_at.is_(None),
        post_status_read_filter(current_user),
        _post_feed_scope_filter(scope),
    ]
    filters.extend(_post_feed_notice_filters(scope, notice_category))
    filters.extend(_post_feed_search_filters(scope, q, current_user))
    filters.extend(_post_feed_block_filters(db, scope, current_user))
    return _post_feed_response(
        db=db,
        current_user=current_user,
        filters=filters,
        order_by=_post_list_order(sort),
        page=page,
        size=size,
        q=q,
    )
```

Implementation requirements:

- Join `Board` and `User` before applying filters.
- Filter active boards, `Post.deleted_at IS NULL`, `post_status_read_filter(current_user)`, and `_post_feed_scope_filter(scope)`.
- Apply the notice-category predicate only for `scope=notices`; reject it with normalized `422` for other scopes.
- Apply author-name search only when the selected boards do not force anonymous identity; otherwise search title/body only.
- Exclude blocked authors without revealing forced-anonymous identities.
- Reuse the current attachment-count and first-image thumbnail subqueries.
- Select `Post`, `Board`, live nickname/cohort, attachment count, and thumbnail fields in one page query.
- Serialize with each row's actual `Board` so metadata, anonymity, content preview, suggestion, and mutual-aid rules remain correct.
- Count after all permissions and scope filters, then apply `_post_list_order(sort)`, offset, and limit.
- Change the existing single-board route to call `_post_list_order(sort)`.
- `_post_feed_response` owns only the aggregate count/page query and response envelope; it must call `_serialize_post_list_item` for every selected row and must not alter the single-board SQL path.

- [ ] **Step 5: Update the API contract**

Add the route, query values, scope definitions, ordering, permission behavior, and shared pagination response to `API_CONTRACT.md`. Remove no existing single-board contract.

- [ ] **Step 6: Run focused and adjacent backend tests**

Run:

```powershell
python -m pytest tests/test_post_feed.py tests/test_post_privacy.py tests/test_figma_board_contract.py -q
```

Expected: all pass.

- [ ] **Step 7: Commit the backend feed**

```powershell
git add backend/app/routers/posts.py backend/tests/test_post_feed.py docs/phase2/API_CONTRACT.md
git commit -m "feat(backend): add paginated aggregate post feeds"
```

---

### Task 2: Infinite Feed Cache Utilities

**Files:**
- Create: `frontend/utils/postFeedPagination.ts`
- Create: `frontend/tests/postFeedPagination.test.ts`

**Interfaces:**
- Consumes: `ApiSuccess<PostListItem[]>` pages.
- Produces: `nextPostPage`, `uniquePostItems`, `firstPostPageData`, and `refreshFirstPostPage`.

- [ ] **Step 1: Write failing utility tests**

Cover page progression, malformed pagination, empty pages, duplicate IDs, and atomic refresh:

```ts
test("다음 페이지는 서버 페이지가 진행하고 데이터가 있을 때만 반환한다", () => {
  assert.equal(nextPostPage(page(1, 3, [post(1)])), 2);
  assert.equal(nextPostPage(page(1, 3, [])), undefined);
  assert.equal(nextPostPage(page(3, 3, [post(3)])), undefined);
});

test("첫 페이지 새로고침 실패는 기존 캐시를 교체하지 않는다", async () => {
  let committed = false;
  await assert.rejects(() => refreshFirstPostPage(
    async () => { throw new Error("offline"); },
    () => { committed = true; },
  ));
  assert.equal(committed, false);
});
```

- [ ] **Step 2: Run the utility test and confirm red**

```powershell
npx tsx --test tests/postFeedPagination.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement pure cache utilities**

Use these signatures:

```ts
export type PostPage = ApiSuccess<PostListItem[]>;

export function nextPostPage(lastPage: PostPage): number | undefined;

export function uniquePostItems(pages: readonly PostPage[]): PostListItem[];

export function firstPostPageData(firstPage: PostPage): InfiniteData<PostPage, number>;

export async function refreshFirstPostPage(
  load: () => Promise<PostPage>,
  commit: (data: InfiniteData<PostPage, number>) => void,
): Promise<void>;
```

`uniquePostItems` preserves the first occurrence and page order. `refreshFirstPostPage` calls `commit` only after `load` succeeds.

- [ ] **Step 4: Run the utility test and confirm green**

```powershell
npx tsx --test tests/postFeedPagination.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit the utilities**

```powershell
git add frontend/utils/postFeedPagination.ts frontend/tests/postFeedPagination.test.ts
git commit -m "test(frontend): define infinite feed cache behavior"
```

---

### Task 3: Post API and React Query Hooks

**Files:**
- Modify: `frontend/services/api.ts:346-370`
- Modify: `frontend/hooks/usePosts.ts:1-61`
- Create: `frontend/tests/postFeedHooks.test.ts`

**Interfaces:**
- Consumes: Task 1 `/posts/feed` and Task 2 cache utilities.
- Produces: `postApi.getFeed`, enhanced `useBoardPosts`, and `useAggregatePosts` with `refreshFirstPage` and `isRefreshingFirstPage`.

- [ ] **Step 1: Write failing service/hook contract tests**

The test should verify source-level and pure contracts without mounting React:

```ts
test("집계 피드 서비스는 scope와 page를 /posts/feed에 전달한다", () => {
  assert.match(apiSource, /getFeed/);
  assert.match(apiSource, /api\.get<.*>\("\/posts\/feed"/s);
});

test("단일·집계 무한 쿼리는 공통 nextPostPage와 첫 페이지 새로고침을 사용한다", () => {
  assert.match(hookSource, /nextPostPage/);
  assert.match(hookSource, /refreshFirstPostPage/);
  assert.match(hookSource, /useAggregatePosts/);
});
```

- [ ] **Step 2: Run and confirm red**

```powershell
npx tsx --test tests/postFeedHooks.test.ts
```

- [ ] **Step 3: Add the feed service**

Add:

```ts
getFeed: async (params: {
  scope: "notices" | "resources" | "council_activity";
  page: number;
  size: number;
  q?: string;
  notice_category?: "academic" | "event" | "other";
  sort?: "latest" | "popular" | "views";
}) => {
  const response = await api.get<ApiSuccess<PostListItem[]>>("/posts/feed", { params });
  return response.data;
},
```

- [ ] **Step 4: Refactor the hooks around one internal infinite-query builder**

Keep external callers compatible and add an optional enabled flag:

```ts
export function useBoardPosts(boardId: number, filters?: PostFilters, enabled = true): InfinitePostQuery;

export function useAggregatePosts(
  scope: PostFeedScope,
  filters?: AggregatePostFilters,
  enabled = true,
): InfinitePostQuery;
```

`InfinitePostQuery` extends the TanStack result with:

```ts
{
  items: PostListItem[];
  refreshFirstPage: () => Promise<void>;
  isRefreshingFirstPage: boolean;
}
```

The refresh function loads page 1 directly, then atomically writes `firstPostPageData(response)` into the exact current query key. It must not call the infinite query's default `refetch`, because that refetches every accumulated page.

- [ ] **Step 5: Run focused frontend tests and typecheck**

```powershell
npx tsx --test tests/postFeedPagination.test.ts tests/postFeedHooks.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit the feed client**

```powershell
git add frontend/services/api.ts frontend/hooks/usePosts.ts frontend/tests/postFeedHooks.test.ts
git commit -m "feat(frontend): add reusable paginated post feeds"
```

---

### Task 4: Notices Pagination and Refresh

**Files:**
- Modify: `frontend/app/(tabs)/notices.tsx:89-223`
- Modify: `frontend/tests/noticeFeed.test.ts`
- Modify: `frontend/tests/pullToRefresh.test.ts`

**Interfaces:**
- Consumes: `useAggregatePosts("notices", noticeFilters)`.
- Produces: a 20-item `FlatList` notice feed with filter-aware pagination and first-page pull refresh.

- [ ] **Step 1: Write failing Notices integration assertions**

Assert that Notices no longer calls `useMultiBoardPosts`, uses the aggregate hook, renders a `FlatList`, exposes `onEndReached`, and sends the selected notice category to the query instead of client-filtering a fixed batch.

```ts
assert.doesNotMatch(noticesSource, /useMultiBoardPosts/);
assert.match(noticesSource, /useAggregatePosts\("notices"/);
assert.match(noticesSource, /<FlatList/);
assert.match(noticesSource, /onEndReached/);
assert.match(noticesSource, /refreshFirstPage/);
```

- [ ] **Step 2: Run and confirm red**

```powershell
npx tsx --test tests/noticeFeed.test.ts tests/pullToRefresh.test.ts
```

- [ ] **Step 3: Replace the fixed multi-board query**

Map UI filters exactly:

```ts
const noticeCategory = selectedFilter === "all" ? undefined : selectedFilter;
const postsQuery = useAggregatePosts("notices", {
  notice_category: noticeCategory,
  sort: "latest",
});
```

Build rows directly from `postsQuery.items`; retain existing category labels and row navigation. Do not change the existing tab reset wrapper or detail route.

- [ ] **Step 4: Convert the list container and wire pagination**

Use `FlatList` with:

```tsx
onEndReached={() => {
  if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage && !postsQuery.isRefreshingFirstPage) {
    void postsQuery.fetchNextPage();
  }
}}
onEndReachedThreshold={0.4}
onRefresh={() => void refreshQueries([refetchBoards, postsQuery.refreshFirstPage])}
refreshing={!boardsLoading && (boardsRefetching || postsQuery.isRefreshingFirstPage)}
ListFooterComponent={postsQuery.isFetchingNextPage ? <ActivityIndicator color={COLORS.primary} /> : null}
```

Preserve existing empty/error/connection-strip and selected-filter behavior.

- [ ] **Step 5: Run focused tests and typecheck**

```powershell
npx tsx --test tests/noticeFeed.test.ts tests/pullToRefresh.test.ts tests/tabRootReset.test.ts tests/boardNavigation.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit Notices**

```powershell
git add frontend/app/'(tabs)'/notices.tsx frontend/tests/noticeFeed.test.ts frontend/tests/pullToRefresh.test.ts
git commit -m "feat(frontend): paginate the notice feed"
```

---

### Task 5: Resource-All and Council-Activity Pagination

**Files:**
- Modify: `frontend/app/(tabs)/board/[boardId].tsx:657-719,911-1069,1184-1236`
- Create: `frontend/tests/aggregateBoardFeeds.test.ts`

**Interfaces:**
- Consumes: `useAggregatePosts("resources")`, `useAggregatePosts("council_activity")`, and enabled-aware `useBoardPosts`.
- Produces: exact aggregate pagination only when those virtual lists are active.

- [ ] **Step 1: Write failing aggregate-screen tests**

Assert:

```ts
assert.match(source, /useAggregatePosts\("resources"/);
assert.match(source, /useAggregatePosts\("council_activity"/);
assert.doesNotMatch(source, /useMultiBoardPosts\(resourceBoardIds/);
assert.match(source, /isResourceAll/);
assert.match(source, /onEndReached/);
```

Also assert the resource aggregate query receives `enabled=isResourceAll`, the council aggregate receives `enabled=isCouncilActivityHistory`, and the single-board query is disabled while either aggregate is active.

- [ ] **Step 2: Run and confirm red**

```powershell
npx tsx --test tests/aggregateBoardFeeds.test.ts
```

- [ ] **Step 3: Replace resource fan-out with the aggregate hook**

```ts
const useAggregateFeed = isResourceAll || isCouncilActivityHistory;
const boardPostsQuery = useBoardPosts(boardId, boardFilters, !useAggregateFeed);
const resourceAllQuery = useAggregatePosts(
  "resources",
  { q: query || undefined, sort: resourceSort },
  isResourceAll,
);
const councilActivityQuery = useAggregatePosts(
  "council_activity",
  { sort: "latest" },
  isCouncilActivityHistory,
);
```

Select exactly one active query for `items`, loading, first-page error, refresh, next page, and footer state. Remove unconditional resource board ID collection and `councilNoticeQuery` fan-out.

- [ ] **Step 4: Add pagination props to the specialized council activity list**

Extend `CouncilActivityHistoryScreen` with `hasNextPage`, `isFetchingNextPage`, `onLoadMore`, and a footer retry/loading state. Its `FlatList` uses the same guarded `onEndReached` rule as generic boards.

- [ ] **Step 5: Preserve existing single-board and navigation behavior**

Do not modify `navigateToBoard`, `exitBoardDepth`, `postDetailRoute`, section tabs, filters, `detailReturnRoute`, or `FlatList` presentation keys. Pull refresh uses only the active query's `refreshFirstPage` and retains the existing selected filter/sort/search state.

- [ ] **Step 6: Run focused tests and typecheck**

```powershell
npx tsx --test tests/aggregateBoardFeeds.test.ts tests/resourceBoards.test.ts tests/boardNavigation.test.ts tests/tabRootReset.test.ts
npm run typecheck
```

- [ ] **Step 7: Commit aggregate screens**

```powershell
git add frontend/app/'(tabs)'/board/'[boardId].tsx' frontend/tests/aggregateBoardFeeds.test.ts
git commit -m "feat(frontend): paginate aggregate board feeds"
```

---

### Task 6: Home Notice Preview Efficiency

**Files:**
- Modify: `frontend/app/(tabs)/home.tsx:632-668`
- Modify: `frontend/hooks/usePosts.ts:47-61`
- Modify: `frontend/utils/noticeFeed.ts:105-121`
- Modify: `frontend/tests/homeNoticeSelection.test.ts`
- Modify: `frontend/tests/noticeFeed.test.ts`

**Interfaces:**
- Consumes: `postApi.getFeed({scope:"notices", page:1, size:2, sort:"latest"})`.
- Produces: exactly one two-row request for the Home notice preview.

- [ ] **Step 1: Change the Home test to require a bounded aggregate request**

```ts
assert.match(homeSource, /postApi\.getFeed/);
assert.match(homeSource, /scope:\s*"notices"/);
assert.match(homeSource, /size:\s*2/);
assert.doesNotMatch(homeSource, /useAllMultiBoardPosts/);
```

- [ ] **Step 2: Run and confirm red**

```powershell
npx tsx --test tests/homeNoticeSelection.test.ts tests/noticeFeed.test.ts
```

- [ ] **Step 3: Replace the all-pages Home query**

Use a normal bounded query:

```ts
const noticesQuery = useQuery({
  queryKey: ["home", "notices"],
  queryFn: () => postApi.getFeed({ scope: "notices", page: 1, size: 2, sort: "latest" }),
});
```

Use `noticesQuery.data?.data ?? []` directly. Keep the current Home section renderer, category label, retry, pull refresh, and navigation unchanged.

- [ ] **Step 4: Remove the now-unused all-pages loader**

Delete `useAllMultiBoardPosts` and `loadAllBoardPosts` only after `rg` confirms no production consumers remain. Remove or rewrite tests that assert the intentional full scan; retain tests for category labels and feed selection.

- [ ] **Step 5: Run focused tests and typecheck**

```powershell
npx tsx --test tests/homeNoticeSelection.test.ts tests/noticeFeed.test.ts tests/pullToRefresh.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit Home efficiency**

```powershell
git add frontend/app/'(tabs)'/home.tsx frontend/hooks/usePosts.ts frontend/utils/noticeFeed.ts frontend/tests/homeNoticeSelection.test.ts frontend/tests/noticeFeed.test.ts
git commit -m "perf(frontend): bound the home notice query"
```

---

### Task 7: Full Regression and Visual QA

**Files:**
- Modify only if verification finds an in-scope pagination/refresh defect.
- Update: `CODEX.md` with implementation and verification evidence if the work package status changes.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: test evidence plus browser/device-flow verification without navigation changes.

- [ ] **Step 1: Run complete automated verification**

Backend:

```powershell
python -m compileall -q app
python -m pytest -q
```

Frontend:

```powershell
npm test
npm run typecheck
npm run lint
npm run export:web
```

Repository:

```powershell
git diff --check
git status --short
```

Expected: tests/typecheck/compile/export exit `0`; lint has no errors. Pre-existing warnings are reported, not silently claimed clean.

- [ ] **Step 2: Start the local backend and Expo web build**

Use the repository's documented local environment and existing credentials. Start each process in a reusable terminal session; do not change checked-in environment files.

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
npm run start -- --web --port 8081
```

- [ ] **Step 3: Verify requests and behavior in the browser**

Use the in-app browser developer/network view where available and check:

1. Notices initially requests page 1, size 20; reaching the bottom requests page 2 once.
2. Academic/event/other filter changes request the matching server filter and start at page 1.
3. Pulling Notices refreshes page 1 while keeping the selected filter.
4. Community event album and an individual resource board still paginate and refresh.
5. Resource `전체` uses one aggregate request, not four board requests, and page 2 appends.
6. Participation guide and activity certification still paginate/refresh through the single-board path.
7. Council activity history appends page 2 and refreshes page 1.
8. Home performs one notice request with size 2 and never scans every notice page.

- [ ] **Step 4: Verify navigation regression in the browser**

Without changing code, exercise:

1. Open a post from each changed list and use the header Back.
2. Switch to another bottom tab and return.
3. Explicitly press Notices, Community, and Participation bottom tabs again.
4. Confirm the same default-reset behavior and routes as before the change.

Record any environment limitation separately from a code failure. Do not claim native pull gestures are verified from web alone; web verifies list refresh callback and request behavior, while iOS/Android require a device/emulator.

- [ ] **Step 5: Update implementation evidence and commit verification docs**

Update `CODEX.md` only with commands actually run and exact passed/blocked visual scenarios.

```powershell
git add CODEX.md
git commit -m "docs: record board feed pagination verification"
```

- [ ] **Step 6: Request final code review**

Invoke `superpowers:requesting-code-review`, resolve any in-scope findings, rerun the affected focused tests, then rerun the full verification gate before declaring completion.
