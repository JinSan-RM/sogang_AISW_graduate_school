# Resource Post Board Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an author or administrator to move an existing resource-sharing post among the four active resource boards while preserving the post and its related data.

**Architecture:** Add an optional `board_id` to the existing post update contract. The backend remains authoritative: it permits a changed board only when both source and target are active `resources`/`resource` boards and the caller can write to the target. The resource edit screen exposes only those eligible boards and refreshes both source and target feeds after the update.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy 2.0, pytest, React Native, Expo Router, TanStack Query, TypeScript node tests.

## Global Constraints

- Moving is limited to active boards where `category == "resources"` and `board_type == "resource"`.
- Preserve the post ID, attachments, comments, likes, and bookmarks.
- Enforce target-board write permission in the backend.
- Keep all non-resource edit behavior unchanged.
- Document the updated API and frontend route behavior.

---

### Task 1: Backend move contract and authorization

**Files:**
- Create: `backend/tests/test_resource_post_board_move.py`
- Modify: `backend/app/schemas/post.py`
- Modify: `backend/app/routers/posts.py`
- Modify: `docs/phase2/API_CONTRACT.md`

**Interfaces:**
- Consumes: `PUT /posts/{post_id}` and existing board permission helpers.
- Produces: optional `PostUpdate.board_id: int | None` while preserving the existing update response `{id}`.

- [x] **Step 1: Write failing API tests**

Add integration tests proving that an owner can move a resource post while related rows remain attached, that a non-resource destination is rejected, and that a target board without member write permission is rejected.

- [x] **Step 2: Run tests and verify RED**

Run: `pytest backend/tests/test_resource_post_board_move.py -q`

Expected: the allowed move test fails because `board_id` is ignored and the rejection tests fail because the API currently has no move validation.

- [x] **Step 3: Implement the minimal backend behavior**

Add `board_id` to `PostUpdate`; resolve a changed target board after owner/admin authorization; validate resource scope, active state, and target write permission; apply all content policies against the target board; persist `post.board_id`; preserve the existing response contract.

- [x] **Step 4: Run backend tests and verify GREEN**

Run: `pytest backend/tests/test_resource_post_board_move.py -q`

Expected: all move tests pass.

### Task 2: Resource edit board picker and cache refresh

**Files:**
- Modify: `frontend/utils/resourceBoards.ts`
- Modify: `frontend/tests/resourceBoards.test.ts`
- Modify: `frontend/services/api.ts`
- Modify: `frontend/hooks/usePosts.ts`
- Modify: `frontend/app/board/post/edit/[postId].tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: grouped board data and the update API from Task 1.
- Produces: `resourcePostEditBoards(boards, sourceBoard)` and a resource-only board picker that submits `board_id`.

- [x] **Step 1: Write failing frontend behavior tests**

Add tests proving that resource edits expose only active resource boards and non-resource edits expose no move destinations.

- [x] **Step 2: Run tests and verify RED**

Run: `npm test -- --test-name-pattern="수정"`

Expected: the test fails because `resourcePostEditBoards` does not exist.

- [x] **Step 3: Implement the minimal frontend behavior**

Add the resource-board filter, render a selectable board field only for resource edits, submit the selected `board_id`, and invalidate post detail plus all post-list caches after a successful update.

- [x] **Step 4: Run frontend tests and verify GREEN**

Run: `npm test -- --test-name-pattern="수정"`

Expected: the resource edit tests pass.

### Task 3: Full verification and commit

**Files:**
- Verify all files listed above.

**Interfaces:**
- Consumes: completed backend and frontend behavior.
- Produces: verified commit containing only this feature and its plan/docs/tests.

- [x] **Step 1: Run targeted and regression checks**

Run backend targeted tests, frontend tests, frontend typecheck, and backend compile/import checks.

- [x] **Step 2: Verify the visible screen behavior**

Open a resource post edit screen in the local app, confirm the board picker is visible, and confirm a non-resource edit retains the read-only board field.

- [x] **Step 3: Review the diff and commit only scoped files**

Stage only the files listed in Tasks 1 and 2 plus this plan, preserving unrelated working-tree changes, then commit with a focused message.
