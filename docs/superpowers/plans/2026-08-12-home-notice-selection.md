# Home Latest Notices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show exactly the two newest notices on Home across every active notice category, ignoring pin status.

**Architecture:** Add a Home-only pure selector to `noticeFeed.ts` that filters active notice boards, removes duplicate IDs, ignores `is_pinned`, and sorts by creation time. Replace Home's single preferred-board query with the existing multi-board query while leaving the Notices tab and backend ordering unchanged.

**Tech Stack:** TypeScript, React Native, Expo Router, TanStack Query, Node test runner via `tsx`

## Global Constraints

- Change only the Home notice selection behavior.
- Include every active board with `board_type === "notice"`.
- Remove duplicate post IDs.
- Ignore `is_pinned` completely on Home.
- Sort by `created_at` descending and post ID descending as the tie-breaker.
- Display at most two notices.
- Preserve the Notices tab, backend API ordering, pin-management features, and unrelated user work.

## File Structure

- Modify `frontend/utils/noticeFeed.ts`: add the Home-only selector without changing shared pinned-first filtering.
- Modify `frontend/tests/noticeFeed.test.ts`: cover all-category eligibility, exclusions, duplicates, newest-first ordering, and ignored pin state.
- Create `frontend/tests/homeNoticeSelection.test.ts`: verify that Home uses all notice boards and the Home-only selector.
- Modify `frontend/app/(tabs)/home.tsx`: replace the preferred-board query with the existing multi-board query.
- Modify `docs/phase2/FRONTEND_ROUTE_SPEC.md` and `CODEX.md`: record the exact Home-only rule.

---

### Task 1: Add the Home-Only Latest Notice Selector

**Files:**
- Modify: `frontend/tests/noticeFeed.test.ts`
- Modify: `frontend/utils/noticeFeed.ts`

**Interfaces:**
- Consumes: `Board`, `PostListItem`, and `isNoticeContentBoard(board: Board): boolean`.
- Produces: `homeNoticePosts(posts: PostListItem[], boards: Board[], limit?: number): PostListItem[]`, defaulting `limit` to `2`.

- [ ] **Step 1: Write the failing selector tests**

In `frontend/tests/noticeFeed.test.ts`, import the module namespace and add a safe accessor so the test fails with a clear assertion before the export exists:

```ts
import * as noticeFeed from "../utils/noticeFeed";

type HomeNoticeSelector = (
  posts: PostListItem[],
  boards: Board[],
  limit?: number
) => PostListItem[];

function selectHomeNotices(posts: PostListItem[], boards: Board[], limit = 2) {
  const selector = (noticeFeed as typeof noticeFeed & { homeNoticePosts?: HomeNoticeSelector }).homeNoticePosts;
  if (!selector) assert.fail("homeNoticePosts must be exported");
  return selector(posts, boards, limit);
}
```

Add these cases, using the existing `board` and `post` factories:

```ts
const homeBoards = [
  board(1, "all-notices"),
  board(2, "academic-notices"),
  board(3, "event-notices"),
  board(4, "webinar-notices"),
  board(5, "academic-calendar", "calendar"),
  { ...board(6, "inactive-notices"), is_active: false },
];

test("홈 공지는 모든 활성 공지 카테고리에서 최신 두 개를 선택한다", () => {
  const rows = [
    post(1, 1, "all"),
    post(2, 2, "academic"),
    post(3, 3, "event"),
    post(4, 4, "webinar"),
    post(5, 5, "academic"),
    post(6, 6, "other"),
  ];

  assert.deepEqual(selectHomeNotices(rows, homeBoards).map((item) => item.id), [4, 3]);
});

test("홈 공지는 중복을 제거하고 오래된 고정글보다 최신 일반 공지를 우선한다", () => {
  const oldPinned = {
    ...post(1, 1, "all", true),
    created_at: "2026-07-01T00:00:00Z",
  };
  const newest = post(4, 4, "webinar");
  const secondNewest = post(3, 3, "event");

  assert.deepEqual(
    selectHomeNotices([oldPinned, newest, { ...newest }, secondNewest], homeBoards).map((item) => item.id),
    [4, 3]
  );
});

test("홈 공지는 작성 시간이 같으면 큰 게시글 ID를 먼저 선택한다", () => {
  const sameTime = "2026-08-12T00:00:00Z";
  const rows = [
    { ...post(1, 1), created_at: sameTime },
    { ...post(2, 2), created_at: sameTime },
    { ...post(3, 3), created_at: "2026-08-11T00:00:00Z" },
  ];

  assert.deepEqual(selectHomeNotices(rows, homeBoards).map((item) => item.id), [2, 1]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend`:

```powershell
npx tsx --test tests/noticeFeed.test.ts
```

Expected: FAIL with `homeNoticePosts must be exported` because the Home-only selector does not exist yet.

- [ ] **Step 3: Implement the minimal Home-only selector**

Append to `frontend/utils/noticeFeed.ts` without changing `noticePostsForFilter`:

```ts
export function homeNoticePosts(posts: PostListItem[], boards: Board[], limit = 2) {
  const activeNoticeBoardIds = new Set(
    boards.filter(isNoticeContentBoard).map((board) => board.id)
  );
  const seen = new Set<number>();

  return posts
    .filter((post) => {
      if (!activeNoticeBoardIds.has(post.board_id) || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    })
    .sort((left, right) => {
      const createdAtDelta = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return createdAtDelta || right.id - left.id;
    })
    .slice(0, limit);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run from `frontend`:

```powershell
npx tsx --test tests/noticeFeed.test.ts
```

Expected: all existing notice-feed tests and all new Home selector tests pass.

- [ ] **Step 5: Commit the selector**

```powershell
git add -- frontend/utils/noticeFeed.ts frontend/tests/noticeFeed.test.ts
git commit -m "feat: select latest notices for home"
```

---

### Task 2: Use Every Active Notice Board on Home

**Files:**
- Create: `frontend/tests/homeNoticeSelection.test.ts`
- Modify: `frontend/app/(tabs)/home.tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: `homeNoticePosts(posts, boards, limit?)`, `isNoticeContentBoard(board)`, and `useMultiBoardPosts(boardIds, filters?)`.
- Produces: a Home notice list sourced from all active notice boards and limited to the newest two posts.

- [ ] **Step 1: Write the failing Home wiring test**

Create `frontend/tests/homeNoticeSelection.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync("app/(tabs)/home.tsx", "utf8");

test("홈 공지는 단일 슬러그 대신 모든 활성 공지 게시판의 최신 두 개를 사용한다", () => {
  assert.match(homeSource, /useMultiBoardPosts/);
  assert.match(homeSource, /boards\.filter\(isNoticeContentBoard\)/);
  assert.match(homeSource, /useMultiBoardPosts\(noticeBoardIds, \{ sort: "latest" \}\)/);
  assert.match(homeSource, /homeNoticePosts\(noticesQuery\.data \?\? \[\], noticeBoards\)/);
  assert.doesNotMatch(homeSource, /NOTICE_BOARD_SLUGS/);
  assert.doesNotMatch(homeSource, /postApi\.getPosts\(noticeBoardId/);
});
```

- [ ] **Step 2: Run the wiring test and verify RED**

Run from `frontend`:

```powershell
npx tsx --test tests/homeNoticeSelection.test.ts
```

Expected: FAIL because Home still contains `NOTICE_BOARD_SLUGS` and queries one `noticeBoardId`.

- [ ] **Step 3: Replace Home's single-board query**

In `frontend/app/(tabs)/home.tsx`, add:

```ts
import { useMultiBoardPosts } from "../../hooks/usePosts";
import { homeNoticePosts, isNoticeContentBoard } from "../../utils/noticeFeed";
```

Delete `NOTICE_BOARD_SLUGS`. Replace `noticeBoardId` and the direct notice `useQuery` with:

```ts
const noticeBoards = useMemo(() => boards.filter(isNoticeContentBoard), [boards]);
const noticeBoardIds = useMemo(() => noticeBoards.map((board) => board.id), [noticeBoards]);

const noticesQuery = useMultiBoardPosts(noticeBoardIds, { sort: "latest" });

const notices = useMemo(
  () => homeNoticePosts(noticesQuery.data ?? [], noticeBoards),
  [noticeBoards, noticesQuery.data]
);
```

Pass the selected list to the existing Home state UI:

```tsx
<NoticeList
  posts={notices}
  loading={noticesQuery.isLoading || boardsLoading}
  isError={boardsError || noticesQuery.isError}
  onRetry={() => void Promise.all([refetchBoards(), noticesQuery.refetch()])}
/>
```

Remove `NoticeList`'s obsolete `boardId` prop and zero-size placeholder. Replace `const rows = posts.slice(0, 2);` with `const rows = posts;` because the Home selector owns the two-item limit.

- [ ] **Step 4: Update the Home-only contract records**

Replace `Latest pinned notices.` in `docs/phase2/FRONTEND_ROUTE_SPEC.md` with:

```markdown
- Latest two notices across every active notice board, ordered by creation time without pin priority.
```

Append this sentence to the completed notice-feed item in `CODEX.md`:

```markdown
Home uses the same active notice-board set and shows the two newest deduplicated notices without pin priority.
```

- [ ] **Step 5: Run both focused test files and verify GREEN**

Run from `frontend`:

```powershell
npx tsx --test tests/noticeFeed.test.ts tests/homeNoticeSelection.test.ts
```

Expected: both test files pass without warnings or unhandled errors.

- [ ] **Step 6: Commit the Home wiring and contract updates**

```powershell
git add -- 'frontend/app/(tabs)/home.tsx' frontend/tests/homeNoticeSelection.test.ts docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "fix: show latest notices across home categories"
```

---

### Task 3: Verify the Complete Change

**Files:**
- Verify only; no file changes expected.

**Interfaces:**
- Consumes: the Home-only selector and Home wiring from Tasks 1 and 2.
- Produces: full frontend regression and type-safety evidence.

- [ ] **Step 1: Run the full frontend test suite**

From `frontend`:

```powershell
npm test
```

Expected: zero failing frontend tests.

- [ ] **Step 2: Run the frontend typecheck**

From `frontend`:

```powershell
npm run typecheck
```

Expected: exit code `0` with no TypeScript diagnostics.

- [ ] **Step 3: Verify formatting and scope**

From the repository root:

```powershell
git diff --check HEAD~2..HEAD
git status --short
```

Expected: no whitespace errors; unrelated pre-existing user files remain untouched.
