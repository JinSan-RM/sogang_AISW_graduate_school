# Reply Target Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the internal comment ID shown during reply composition with the selected comment author's visible label, remove `작성 중`, and show the result in a verified browser capture.

**Architecture:** Add a small pure reply-composer view-model utility that owns the selected target, API parent ID, notice copy, and placeholder. The post-detail screen consumes that tested view model, while `CommentItem` passes the selected comment object instead of only its ID. Backend contracts remain unchanged.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript 5.9, Node test runner via `tsx --test`, FastAPI/PostgreSQL local QA stack for browser verification.

## Global Constraints

- User-facing reply copy is `<visible cohort/name>님에게 답글` and never contains the internal parent comment ID.
- User-facing reply copy does not contain `작성 중`.
- Reply mode uses `답글을 남겨보세요`; ordinary mode keeps `댓글을 남겨보세요`.
- Anonymous and historical author labels reuse the value already visible on the selected comment.
- Submission still sends the numeric comment ID as `parent_id`.
- No backend, database, migration, route, comment ordering, or two-depth permission changes.
- Keep the existing comment input and send-button geometry.

---

### Task 1: Tested reply-composer view model

**Files:**
- Create: `frontend/utils/replyComposer.ts`
- Create: `frontend/tests/replyComposer.test.ts`

**Interfaces:**
- Consumes: `CommentNode` from `frontend/types/index.ts` and `formatCohortName` from `frontend/utils/userLabel.ts`.
- Produces: `ReplyTarget`, `createReplyTarget(comment)`, and `getReplyComposerState(target)`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { createReplyTarget, getReplyComposerState } from "../utils/replyComposer";

test("답글 대상은 화면에 보이는 기수와 이름을 사용한다", () => {
  const target = createReplyTarget({
    id: 248,
    author_cohort: "72",
    author_nickname: "김진산",
  });

  assert.deepEqual(target, { commentId: 248, authorLabel: "72기 김진산" });
});

test("답글 작성 상태는 내부 ID와 작성 중 문구를 노출하지 않는다", () => {
  const state = getReplyComposerState({ commentId: 248, authorLabel: "72기 김진산" });

  assert.equal(state.parentId, 248);
  assert.equal(state.noticeText, "72기 김진산님에게 답글");
  assert.equal(state.placeholder, "답글을 남겨보세요");
  assert.equal(state.noticeText.includes("248"), false);
  assert.equal(state.noticeText.includes("작성 중"), false);
});

test("일반 댓글 상태는 답글 대상 없이 기존 입력 문구를 사용한다", () => {
  assert.deepEqual(getReplyComposerState(null), {
    parentId: null,
    noticeText: null,
    placeholder: "댓글을 남겨보세요",
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test tests/replyComposer.test.ts`

Expected: FAIL because `../utils/replyComposer` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { CommentNode } from "../types";
import { formatCohortName } from "./userLabel";

export type ReplyTarget = {
  commentId: number;
  authorLabel: string;
};

type ReplyComment = Pick<CommentNode, "id" | "author_cohort" | "author_nickname">;

export function createReplyTarget(comment: ReplyComment): ReplyTarget {
  return {
    commentId: comment.id,
    authorLabel: formatCohortName(comment.author_cohort, comment.author_nickname),
  };
}

export function getReplyComposerState(target: ReplyTarget | null) {
  if (!target) {
    return { parentId: null, noticeText: null, placeholder: "댓글을 남겨보세요" };
  }
  const politeLabel = target.authorLabel.endsWith("님")
    ? target.authorLabel
    : `${target.authorLabel}님`;
  return {
    parentId: target.commentId,
    noticeText: `${politeLabel}에게 답글`,
    placeholder: "답글을 남겨보세요",
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx tsx --test tests/replyComposer.test.ts`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit the tested view model**

```powershell
git add frontend/utils/replyComposer.ts frontend/tests/replyComposer.test.ts
git commit -m "test: define reply composer state"
```

### Task 2: Wire the selected comment into the post-detail composer

**Files:**
- Modify: `frontend/components/CommentItem.tsx:18,86`
- Modify: `frontend/app/board/post/[postId].tsx:28-36,169,508,943,952-972,2054-2068`

**Interfaces:**
- Consumes: `ReplyTarget`, `createReplyTarget`, and `getReplyComposerState` from Task 1.
- Produces: a reply composer that renders the visible target label and submits `replyComposer.parentId`.

- [ ] **Step 1: Pass the selected comment instead of only its ID**

Change `CommentItem` to declare `onReply?: (comment: CommentNode) => void` and invoke `onReply?.(comment)` from the top-level reply action. Continue forwarding the same callback to child items; the existing `depth === 0` guard keeps nested replies disabled.

- [ ] **Step 2: Replace numeric reply state with the tested target model**

Import the Task 1 interfaces and replace:

```ts
const [replyParentId, setReplyParentId] = useState<number | null>(null);
```

with:

```ts
const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
const replyComposer = getReplyComposerState(replyTarget);
```

Use `replyComposer.parentId` in the create-comment payload. Clear `replyTarget` on cancel, successful submission, and the existing comment-deletion completion path.

- [ ] **Step 3: Render the approved copy and placeholder**

Set the reply callback to:

```tsx
onReply={(comment) => setReplyTarget(createReplyTarget(comment))}
```

Render the target strip only when `replyComposer.noticeText` is non-null:

```tsx
<View style={styles.replyNotice}>
  <View style={styles.replyNoticeTarget}>
    <Ionicons name="arrow-undo-outline" size={14} color={COLORS.primary} />
    <Text style={styles.replyNoticeText}>{replyComposer.noticeText}</Text>
  </View>
  <Pressable accessibilityLabel="답글 대상 취소" onPress={() => setReplyTarget(null)}>
    <Text style={styles.replyCancelText}>취소</Text>
  </Pressable>
</View>
```

Set the input placeholder to `replyComposer.placeholder`.

- [ ] **Step 4: Align the target strip with the existing design language**

Keep the existing input and send button unchanged. Update only the reply strip with a subtle `COLORS.primary50` background, rounded corners, compact padding, centered row alignment, and `fontWeight: "500"` for both text actions. Add `replyNoticeTarget` for icon/text alignment.

- [ ] **Step 5: Run focused behavior and TypeScript verification**

Run: `npx tsx --test --test-name-pattern="답글" tests/replyComposer.test.ts`

Expected: reply-composer tests pass.

Run: `npm run typecheck`

Expected: exit 0 with no type errors in the callback or state changes.

- [ ] **Step 6: Commit the screen integration**

```powershell
git add frontend/components/CommentItem.tsx frontend/app/board/post/[postId].tsx
git commit -m "fix: show reply target author"
```

### Task 3: Document and verify the completed behavior

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:143-151`
- Modify: `CODEX.md:94-99`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/14/019ffdca-fc79-75c2-8aa1-fa778d9e389e/issue-104-reply-target-after.png`

**Interfaces:**
- Consumes: the integrated frontend behavior from Task 2 and the existing local QA compose stack.
- Produces: updated product documentation, full verification evidence, and the requested browser capture.

- [ ] **Step 1: Update product documentation**

Add the reply-target rule to the post-detail comment section of `FRONTEND_ROUTE_SPEC.md`: the fixed composer shows the visible cohort/name plus `님에게 답글`, never exposes the parent ID or `작성 중`, switches the placeholder in reply mode, and restores ordinary mode on cancel or success. Add issue #104 to the completed frontend QA items in `CODEX.md`.

- [ ] **Step 2: Run the complete frontend verification**

Run: `npm test`

Expected: all frontend tests pass with 0 failures.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0 with no new errors.

- [ ] **Step 3: Reproduce the integrated reply state in a browser**

Start the local QA database/backend, seed the deterministic local account (`test@sogang.ac.kr` / `password123`) plus a post and top-level comment, and start Expo web with `EXPO_PUBLIC_API_URL=http://localhost:58000/api`. Sign in, open the seeded post, select `답글`, and do not submit any reply.

- [ ] **Step 4: Capture and inspect the final screen**

Save a browser screenshot to the path listed under **Files**. Confirm visually that the strip names the reply target, omits the numeric ID and `작성 중`, shows `취소`, and the input placeholder reads `답글을 남겨보세요` without changing the send button geometry.

- [ ] **Step 5: Review and commit documentation**

Run: `git diff --check`

Expected: no whitespace errors.

```powershell
git add docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md docs/superpowers/plans/2026-08-14-reply-target-implementation.md
git commit -m "docs: record reply target behavior"
```

- [ ] **Step 6: Verify the branch is clean and review its commits**

Run: `git status --short --branch`

Expected: branch `codex/issue-104-reply-target` with no unstaged or untracked repository changes.

Run: `git log --oneline -4`

Expected: design, tested view model, screen integration, and documentation commits are present.
