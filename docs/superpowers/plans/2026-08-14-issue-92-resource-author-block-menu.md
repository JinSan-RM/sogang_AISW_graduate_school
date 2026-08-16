# Issue #92 Resource Author-Block Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the author-block action from comprehensive-exam and graduation-thesis post menus without changing any other post action or block behavior.

**Architecture:** Extract the shared post-detail author-block visibility decision into a pure frontend utility. The shared detail screen consumes that policy, while focused unit tests lock the two resource exclusions and all existing generic permission checks.

**Tech Stack:** TypeScript, React Native with Expo Router, Node test runner through `tsx`, ESLint.

## Global Constraints

- Exclude only `comprehensive-exam` and `graduation-thesis` from initiating an author block in post detail.
- Preserve edit, delete, report, block API, block settings, and block-based filtering behavior.
- Do not change layout, styling, or copy beyond omitting the disallowed menu row.
- Make no backend, database, or route changes.

---

### Task 1: Tested Author-Block Menu Policy

**Files:**
- Create: `frontend/utils/postMenu.ts`
- Create: `frontend/tests/postMenu.test.ts`
- Modify: `frontend/app/board/post/[postId].tsx:286`

**Interfaces:**
- Consumes: `PostDetail.author_id`, current-user ownership/management facts, suggestion/admin-only board facts, and `Board.slug`.
- Produces: `shouldShowPostAuthorBlock(context: PostAuthorBlockContext): boolean`.

- [ ] **Step 1: Write the failing policy tests**

Create `frontend/tests/postMenu.test.ts`. Load the not-yet-created module through a caught dynamic import so the red run produces an intentional assertion failure instead of a module-loader error, then exercise the real export once implemented.

```ts
import assert from "node:assert/strict";
import test from "node:test";

type Policy = (context: {
  authorId?: number | null;
  isMine: boolean;
  canManagePost: boolean;
  isSuggestionRequest: boolean;
  isAdminOnlyBoard: boolean;
  boardSlug?: string;
}) => boolean;

const moduleUnderTest = await import("../utils/postMenu").catch(() => ({}));
const policy = (moduleUnderTest as { shouldShowPostAuthorBlock?: Policy }).shouldShowPostAuthorBlock;

function shouldShow(overrides: Partial<Parameters<Policy>[0]> = {}) {
  if (!policy) assert.fail("shouldShowPostAuthorBlock must be exported");
  return policy({
    authorId: 12,
    isMine: false,
    canManagePost: false,
    isSuggestionRequest: false,
    isAdminOnlyBoard: false,
    boardSlug: "community-major",
    ...overrides,
  });
}

test("종합시험과 졸업논문 상세에서는 작성자 차단을 제공하지 않는다", () => {
  assert.equal(shouldShow({ boardSlug: "comprehensive-exam" }), false);
  assert.equal(shouldShow({ boardSlug: "graduation-thesis" }), false);
});

test("일반 회원 게시판의 다른 작성자 글에서는 작성자 차단을 유지한다", () => {
  assert.equal(shouldShow(), true);
});

test("기존 작성자 및 게시판 권한 제외 조건을 유지한다", () => {
  assert.equal(shouldShow({ authorId: null }), false);
  assert.equal(shouldShow({ isMine: true }), false);
  assert.equal(shouldShow({ canManagePost: true }), false);
  assert.equal(shouldShow({ isSuggestionRequest: true }), false);
  assert.equal(shouldShow({ isAdminOnlyBoard: true }), false);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend/`:

```powershell
npx tsx --test tests/postMenu.test.ts
```

Expected: FAIL with `shouldShowPostAuthorBlock must be exported`.

- [ ] **Step 3: Implement the minimal pure policy**

Create `frontend/utils/postMenu.ts`:

```ts
export type PostAuthorBlockContext = {
  authorId?: number | null;
  isMine: boolean;
  canManagePost: boolean;
  isSuggestionRequest: boolean;
  isAdminOnlyBoard: boolean;
  boardSlug?: string;
};

const AUTHOR_BLOCK_EXCLUDED_BOARD_SLUGS = new Set([
  "comprehensive-exam",
  "graduation-thesis",
]);

export function shouldShowPostAuthorBlock(context: PostAuthorBlockContext): boolean {
  return context.authorId != null
    && !context.isMine
    && !context.canManagePost
    && !context.isSuggestionRequest
    && !context.isAdminOnlyBoard
    && !AUTHOR_BLOCK_EXCLUDED_BOARD_SLUGS.has(context.boardSlug ?? "");
}
```

Import the helper in `frontend/app/board/post/[postId].tsx` and replace only the inline `showBlockItem` expression:

```ts
const showBlockItem = shouldShowPostAuthorBlock({
  authorId: post.author_id,
  isMine,
  canManagePost,
  isSuggestionRequest,
  isAdminOnlyBoard,
  boardSlug: board?.slug,
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npx tsx --test tests/postMenu.test.ts
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Run frontend regression checks**

Run:

```powershell
npm test
npm run typecheck
npm run lint
```

Expected: every command exits 0 with no failing test, type error, or lint error.

### Task 2: Product Contract and Final Verification

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:76`
- Modify: `CODEX.md` under `P0 already covered`

**Interfaces:**
- Consumes: the completed frontend menu policy from Task 1.
- Produces: an explicit product contract and backlog completion record for issue #92.

- [ ] **Step 1: Document the scoped exception**

Add to the resource-sharing route contract that comprehensive-exam and graduation-thesis omit the author-block action from post detail while keeping other authorized actions. Add a completed P0 issue #92 entry to `CODEX.md` recording that no backend block semantics changed.

- [ ] **Step 2: Verify the final tree**

Run from the repository root:

```powershell
git diff --check
git status --short
git diff -- frontend/utils/postMenu.ts frontend/tests/postMenu.test.ts frontend/app/board/post/[postId].tsx docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
```

Expected: no whitespace errors, only the planned files changed, and the detail-screen diff contains no style, layout, or copy edits.

- [ ] **Step 3: Commit the implementation**

```powershell
git add -- frontend/utils/postMenu.ts frontend/tests/postMenu.test.ts frontend/app/board/post/[postId].tsx docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md docs/superpowers/plans/2026-08-14-issue-92-resource-author-block-menu.md
git commit -m "fix(frontend): hide resource author block action"
```
