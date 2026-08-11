# Community/Participation Post Back Navigation Implementation Plan

> **For Codex:** Execute this plan task-by-task with the `executing-plans` skill and keep the existing dirty worktree changes out of the implementation commit.

**Goal:** Make the post-detail back action exit directly to the correct Community or Participation tab so that two consecutive back presses no longer show visually identical board lists.

**Architecture:** Move the navigation choice into a pure route utility that receives the post's board metadata and current history availability. Community and Participation boards always produce a tab `replace` decision; other boards retain history back when possible and otherwise replace with their product parent route. The header and Android hardware back continue to share one handler.

**Tech Stack:** TypeScript, Expo Router, React Native, Node test runner via `tsx --test`

---

### Task 1: Capture the navigation contract in a failing unit test

**Files:**
- Modify: `frontend/tests/boardNavigation.test.ts`

- [x] Replace the old `fromBoardId`-based action assertions with board-metadata assertions.
- [x] Assert Community resource/album boards replace to `/(tabs)/community`, even when history exists.
- [x] Assert Participation boards replace to `/(tabs)/participation`, even when history exists.
- [x] Assert non-Community/Participation boards use history back when possible and their parent route when history is absent.
- [x] Run the focused navigation test from `frontend` and confirm the new test fails for the missing behavior.

### Task 2: Implement the pure back-decision utility

**Files:**
- Modify: `frontend/utils/appRoutes.ts`
- Test: `frontend/tests/boardNavigation.test.ts`

- [x] Add a discriminated `back`/`replace` decision returned from board metadata plus `canGoBack`.
- [x] Use `boardParentRoute` as the only replacement destination.
- [x] Remove the obsolete board-list fallback helper if it has no remaining consumer.
- [x] Run the focused navigation test and confirm it passes.

### Task 3: Wire both device back paths to the same decision

**Files:**
- Modify: `frontend/app/board/post/[postId].tsx`
- Test: `frontend/tests/boardNavigation.test.ts`

- [x] Replace the `fromBoardId` decision with the new board-aware decision.
- [x] Keep the existing shared callback for the header chevron and Android `BackHandler`.
- [x] Confirm direct-link fallback still resolves through `boardParentRoute`.
- [x] Run the focused navigation test and `npm run typecheck` from `frontend`.

### Task 4: Verify and stage only this scope

**Files:**
- Verify: `frontend/utils/appRoutes.ts`
- Verify: `frontend/app/board/post/[postId].tsx`
- Verify: `frontend/tests/boardNavigation.test.ts`

- [x] Run the complete frontend test suite.
- [x] Run frontend typecheck and lint for changed files or the full project if clean enough.
- [x] Inspect `git diff` and ensure unrelated dirty changes are not staged.
