# Activity Certification Detail Back Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return from an activity-certification post detail to the exact activity-certification list state that opened it.

**Architecture:** Extend the existing pure post-detail navigation decision with the already-recorded `fromBoardId`. Only activity-certification posts with a valid origin and usable back stack choose native back; the detail screen passes the route parameter into the same handler used by the header and Android hardware back.

**Tech Stack:** TypeScript, React Native, Expo Router, Node test runner through `tsx`.

## Global Constraints

- Apply this behavior only to boards whose `board_type` is `activity_certification`.
- Preserve the selected participation group, `활동 인증` mode, list data, and scroll position by returning through the existing navigation stack.
- Keep direct-link, invalid-origin, no-history, and non-activity-certification behavior unchanged.
- Do not change the participation tab layout, default board, backend API, or database.
- Keep header and Android hardware back on the same shared handler.
- Work directly on the current `main` checkout; do not create a worktree or push.

---

### Task 1: Make the Back Decision Respect Activity-Certification Origins

**Files:**
- Modify: `frontend/utils/appRoutes.ts:13-62`
- Test: `frontend/tests/boardNavigation.test.ts`

**Interfaces:**
- Consumes: `routeBoardId(value: unknown): number | null`, `BoardRouteInfo.board_type`, router history availability.
- Produces: `postDetailBackDecision(board, canGoBack, fromBoardId?)` and `navigateFromPostDetail(board, navigator, fromBoardId?)` with activity-certification origin awareness.

- [ ] **Step 1: Write failing decision tests**

Add these cases to `frontend/tests/boardNavigation.test.ts`:

```ts
const activityCertificationBoard = {
  slug: "club-activity",
  category: "participation",
  board_type: "activity_certification",
};

test("활동 인증 상세는 유효한 목록 출처와 탐색 기록이 있으면 기존 목록으로 돌아간다", () => {
  assert.deepEqual(postDetailBackDecision(activityCertificationBoard, true, "16"), {
    action: "back",
  });
});

test("활동 인증 직접 링크나 유효하지 않은 출처는 참여활동 상위 경로로 돌아간다", () => {
  assert.deepEqual(postDetailBackDecision(activityCertificationBoard, true), {
    action: "replace",
    route: PARTICIPATION_TAB_ROUTE,
  });
  assert.deepEqual(postDetailBackDecision(activityCertificationBoard, true, "invalid"), {
    action: "replace",
    route: PARTICIPATION_TAB_ROUTE,
  });
  assert.deepEqual(postDetailBackDecision(activityCertificationBoard, false, "16"), {
    action: "replace",
    route: PARTICIPATION_TAB_ROUTE,
  });
});
```

Keep the existing `networking-programs` participation-guide test unchanged so it continues to prove that ordinary participation details replace to the participation tab.

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend`:

```bash
npx tsx --test tests/boardNavigation.test.ts
```

Expected: the new valid-origin case fails because the third argument is ignored and the decision is `{ action: "replace", route: PARTICIPATION_TAB_ROUTE }`; existing tests pass.

- [ ] **Step 3: Implement the minimal decision change**

Update `frontend/utils/appRoutes.ts`:

```ts
export function postDetailBackDecision(
  board: BoardRouteInfo | null | undefined,
  canGoBack: boolean,
  fromBoardId?: unknown
): PostDetailBackDecision {
  const hasActivityCertificationOrigin =
    board?.board_type === "activity_certification" && routeBoardId(fromBoardId) !== null;
  if (hasActivityCertificationOrigin && canGoBack) {
    return { action: "back" };
  }

  const parentRoute = boardParentRoute(board);
  if (parentRoute === COMMUNITY_TAB_ROUTE || parentRoute === PARTICIPATION_TAB_ROUTE || !canGoBack) {
    return { action: "replace", route: parentRoute };
  }
  return { action: "back" };
}
```

Thread the optional origin through the executor:

```ts
export function navigateFromPostDetail(
  board: BoardRouteInfo | null | undefined,
  navigator: PostDetailNavigator,
  fromBoardId?: unknown
) {
  const decision = postDetailBackDecision(board, navigator.canGoBack(), fromBoardId);
  if (decision.action === "back") {
    navigator.back();
    return;
  }
  navigator.replace(decision.route);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npx tsx --test tests/boardNavigation.test.ts
```

Expected: all navigation decision tests pass.

- [ ] **Step 5: Commit the pure navigation change**

```bash
git add frontend/utils/appRoutes.ts frontend/tests/boardNavigation.test.ts
git commit -m "fix: preserve activity certification list on back"
```

### Task 2: Wire the Detail Route Origin into the Shared Handler

**Files:**
- Modify: `frontend/app/board/post/[postId].tsx:143-229`
- Create: `frontend/tests/activityCertificationBackNavigation.test.ts`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:80-86`
- Modify: `CODEX.md:96`

**Interfaces:**
- Consumes: `params.fromBoardId` from `useLocalSearchParams` and Task 1's `navigateFromPostDetail(board, navigator, fromBoardId?)`.
- Produces: identical header and Android hardware-back behavior through `handlePostBack`.

- [ ] **Step 1: Write a failing wiring test**

Create `frontend/tests/activityCertificationBackNavigation.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("app/board/post/[postId].tsx", "utf8");

test("활동 인증 상세의 공통 뒤로가기는 목록 출처 ID를 전달한다", () => {
  assert.match(
    detailSource,
    /navigateFromPostDetail\(board, \{[\s\S]*?replace: \(route\) => router\.replace\(route as never\),[\s\S]*?\}, params\.fromBoardId\)/
  );
  assert.match(detailSource, /onPress=\{handlePostBack\}/);
  assert.match(detailSource, /hardwareBackPress[\s\S]*?handlePostBack\(\)/);
});
```

- [ ] **Step 2: Run the wiring test and verify RED**

Run from `frontend`:

```bash
npx tsx --test tests/activityCertificationBackNavigation.test.ts
```

Expected: FAIL because `navigateFromPostDetail` is called without `params.fromBoardId`.

- [ ] **Step 3: Pass the origin from the detail route**

Update the existing `handlePostBack` call in `frontend/app/board/post/[postId].tsx`:

```ts
  const handlePostBack = useCallback(() => {
    if (!post) return;
    navigateFromPostDetail(board, {
      canGoBack: () => router.canGoBack(),
      back: () => router.back(),
      replace: (route) => router.replace(route as never),
    }, params.fromBoardId);
  }, [board, params.fromBoardId, post]);
```

Do not add separate header or Android navigation branches; both already invoke `handlePostBack`.

- [ ] **Step 4: Document the corrected navigation contract**

Append to the board-navigation paragraph in `docs/phase2/FRONTEND_ROUTE_SPEC.md`:

```md
Activity-certification details opened from a certification list return through that existing stack so the selected participation group, `활동 인증` mode, list data, and scroll state remain intact; direct links keep the participation-parent fallback.
```

Append to the completed bug #16 entry in `CODEX.md`:

```md
Activity-certification details now consume the recorded origin so header and Android back preserve the exact certification-list state instead of resetting to the club guide.
```

- [ ] **Step 5: Run both focused test files and verify GREEN**

Run:

```bash
npx tsx --test tests/boardNavigation.test.ts tests/activityCertificationBackNavigation.test.ts
```

Expected: all navigation and wiring tests pass.

- [ ] **Step 6: Commit the detail wiring and contract updates**

```bash
git add frontend/app/board/post/[postId].tsx frontend/tests/activityCertificationBackNavigation.test.ts docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "fix: return activity details to certification list"
```

### Task 3: Verify the Complete Frontend

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: the completed navigation decision and detail wiring from Tasks 1 and 2.
- Produces: fresh test, type-check, diff, and worktree evidence.

- [ ] **Step 1: Run the complete frontend test suite**

Run from `frontend`:

```bash
npm test
```

Expected: zero failures.

- [ ] **Step 2: Run TypeScript type checking**

Run:

```bash
npm run typecheck
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Inspect the implementation commits and working tree**

Run from the repository root:

```bash
git diff --check HEAD~2..HEAD
git log -2 --oneline --stat
git status --short --branch
```

Expected: no whitespace errors; only the two planned implementation commits are in the reviewed range; the user's existing untracked files remain untouched.
