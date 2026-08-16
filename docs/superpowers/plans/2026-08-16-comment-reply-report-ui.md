# Comment, Reply, and Report UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align comment, reply, shared report, post-action, and delete-confirmation states with the approved mobile reference while preserving current APIs and permissions.

**Architecture:** Keep the shared Expo Router post-detail route and recursive `CommentItem` component. Add two small pure TypeScript view-model modules for deterministic comment-action and report-form behavior, then consume those tested models from the existing UI and finish with mobile-width browser captures.

**Tech Stack:** React Native 0.81, Expo Router 6, React 19, TypeScript 5.9, TanStack Query 5, Node `node:test`

## Global Constraints

- This is P0 community UX polish tied to `PLAN.md` two-depth comments/replies and `CODEX.md` Work Package 5.
- No backend, database, migration, API contract, or permission change.
- Keep the backend-enforced two-depth model: root comments can receive replies; replies cannot receive nested replies.
- Preserve the current named reply-target strip, payload shapes, comment ordering, notifications, author identity rules, and disabled-comment boards.
- Display `신고` in the reference position on every comment, but an own-comment attempt shows `본인 댓글은 신고할 수 없어요.` without opening a sheet or sending an API request.
- Post and comment reports share one bottom sheet and the exact approved reason order and Korean copy.
- Preserve all unrelated tracked changes and all pre-existing untracked user files.

---

## File Structure

- Create `frontend/utils/commentPresentation.ts`: pure comment action-state, edit-value, and delete-copy model.
- Create `frontend/tests/commentPresentation.test.ts`: behavior tests for comment row states and delete copy.
- Create `frontend/utils/reportForm.ts`: report reason catalog and payload validation/normalization.
- Create `frontend/tests/reportForm.test.ts`: behavior tests for reason order and `기타` validation.
- Modify `frontend/components/CommentItem.tsx`: consume tested state, align visual geometry, and keep edit mode open on failures.
- Modify `frontend/app/board/post/[postId].tsx`: consume report model, wire own-report feedback, align sheets/modals, and use async edit mutation.
- Modify `frontend/tests/designBugVerification.test.ts`: add source-level regression checks for the visual wiring that pure helpers cannot observe.
- Modify `docs/phase2/FRONTEND_ROUTE_SPEC.md`: record the approved comment/report presentation rule.
- Modify `CODEX.md`: record the completed P0 UI-alignment work only after verification succeeds.

---

### Task 1: Tested comment presentation model

**Files:**
- Create: `frontend/utils/commentPresentation.ts`
- Create: `frontend/tests/commentPresentation.test.ts`

**Interfaces:**
- Consumes: primitive row context `{ depth, isMine, isEditing, isReported }`.
- Produces: `COMMENT_DELETE_COPY`, `CommentActionState`, `getCommentActionState(context)`, and `commentEditSubmissionValue(draft, isSaving)`.

- [ ] **Step 1: Write the failing behavior tests**

Create `frontend/tests/commentPresentation.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMENT_DELETE_COPY,
  commentEditSubmissionValue,
  getCommentActionState,
} from "../utils/commentPresentation";

test("내 최상위 댓글은 답글·수정·삭제와 본인 신고 안내 상태를 제공한다", () => {
  assert.deepEqual(
    getCommentActionState({ depth: 0, isMine: true, isEditing: false, isReported: false }),
    {
      showReply: true,
      showEdit: true,
      showDelete: true,
      showSave: false,
      showCancel: false,
      reportLabel: "신고",
      reportAction: "own-unavailable",
    },
  );
});

test("댓글 수정 중에는 저장과 취소만 표시한다", () => {
  assert.deepEqual(
    getCommentActionState({ depth: 0, isMine: true, isEditing: true, isReported: false }),
    {
      showReply: false,
      showEdit: false,
      showDelete: false,
      showSave: true,
      showCancel: true,
      reportLabel: "신고",
      reportAction: "own-unavailable",
    },
  );
});

test("다른 작성자의 대댓글은 추가 답글 없이 신고할 수 있다", () => {
  assert.deepEqual(
    getCommentActionState({ depth: 1, isMine: false, isEditing: false, isReported: false }),
    {
      showReply: false,
      showEdit: false,
      showDelete: false,
      showSave: false,
      showCancel: false,
      reportLabel: "신고",
      reportAction: "open",
    },
  );
});

test("신고 완료 댓글은 재신고 동작을 제공하지 않는다", () => {
  const state = getCommentActionState({ depth: 0, isMine: false, isEditing: false, isReported: true });
  assert.equal(state.reportLabel, "신고됨");
  assert.equal(state.reportAction, "none");
});

test("수정 내용은 공백을 제거하고 빈 값과 저장 중 제출을 막는다", () => {
  assert.equal(commentEditSubmissionValue("  수정한 댓글  ", false), "수정한 댓글");
  assert.equal(commentEditSubmissionValue(" \n\t ", false), null);
  assert.equal(commentEditSubmissionValue("수정한 댓글", true), null);
});

test("댓글 삭제 확인 문구는 승인된 두 줄 문구를 사용한다", () => {
  assert.deepEqual(COMMENT_DELETE_COPY, {
    title: "댓글 삭제",
    body: "댓글을 삭제하시겠어요?\n삭제한 댓글은 복구할 수 없어요.",
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend/`:

```powershell
npx tsx --test tests/commentPresentation.test.ts
```

Expected: FAIL because `../utils/commentPresentation` does not exist.

- [ ] **Step 3: Implement the minimal pure model**

Create `frontend/utils/commentPresentation.ts` with:

```ts
export const COMMENT_DELETE_COPY = {
  title: "댓글 삭제",
  body: "댓글을 삭제하시겠어요?\n삭제한 댓글은 복구할 수 없어요.",
} as const;

export type CommentReportAction = "open" | "own-unavailable" | "none";

export type CommentActionState = {
  showReply: boolean;
  showEdit: boolean;
  showDelete: boolean;
  showSave: boolean;
  showCancel: boolean;
  reportLabel: "신고" | "신고됨";
  reportAction: CommentReportAction;
};

export function getCommentActionState({
  depth,
  isMine,
  isEditing,
  isReported,
}: {
  depth: number;
  isMine: boolean;
  isEditing: boolean;
  isReported: boolean;
}): CommentActionState {
  return {
    showReply: depth === 0 && !isEditing,
    showEdit: isMine && !isEditing,
    showDelete: isMine && !isEditing,
    showSave: isMine && isEditing,
    showCancel: isMine && isEditing,
    reportLabel: isReported ? "신고됨" : "신고",
    reportAction: isReported ? "none" : isMine ? "own-unavailable" : "open",
  };
}

export function commentEditSubmissionValue(draft: string, isSaving: boolean): string | null {
  if (isSaving) return null;
  const trimmed = draft.trim();
  return trimmed || null;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npx tsx --test tests/commentPresentation.test.ts
```

Expected: 6 tests pass with exit code 0.

- [ ] **Step 5: Commit the model and test**

```powershell
git add -- frontend/utils/commentPresentation.ts frontend/tests/commentPresentation.test.ts
git commit -m "test: define comment presentation states"
```

---

### Task 2: Tested shared report form model

**Files:**
- Create: `frontend/utils/reportForm.ts`
- Create: `frontend/tests/reportForm.test.ts`

**Interfaces:**
- Consumes: a `ReportReason` and raw detail string.
- Produces: `REPORT_REASONS`, `ReportReason`, `ReportSubmission`, and `getReportSubmission(reason, detail)`.

- [ ] **Step 1: Write the failing report-form tests**

Create `frontend/tests/reportForm.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_REASONS, getReportSubmission } from "../utils/reportForm";

test("신고 사유는 승인된 순서와 문구를 사용한다", () => {
  assert.deepEqual(REPORT_REASONS, [
    { value: "spam", label: "스팸/광고입니다" },
    { value: "harassment", label: "욕설 및 비방이 포함되어 있어요" },
    { value: "misinformation", label: "허위 정보예요" },
    { value: "other", label: "기타" },
  ]);
});

test("기타 신고는 공백이 아닌 상세 사유가 필요하다", () => {
  assert.equal(getReportSubmission("other", " \n "), null);
  assert.deepEqual(getReportSubmission("other", "  구체적인 사유  "), {
    reason: "other",
    detail: "구체적인 사유",
  });
});

test("선택형 사유는 상세 입력을 전송하지 않는다", () => {
  assert.deepEqual(getReportSubmission("spam", "무시할 상세"), { reason: "spam" });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend/`:

```powershell
npx tsx --test tests/reportForm.test.ts
```

Expected: FAIL because `../utils/reportForm` does not exist.

- [ ] **Step 3: Implement the report reason catalog and payload builder**

Create `frontend/utils/reportForm.ts` with:

```ts
export const REPORT_REASONS = [
  { value: "spam", label: "스팸/광고입니다" },
  { value: "harassment", label: "욕설 및 비방이 포함되어 있어요" },
  { value: "misinformation", label: "허위 정보예요" },
  { value: "other", label: "기타" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export type ReportSubmission = {
  reason: ReportReason;
  detail?: string;
};

export function getReportSubmission(reason: ReportReason, detail: string): ReportSubmission | null {
  if (reason !== "other") return { reason };
  const normalizedDetail = detail.trim();
  return normalizedDetail ? { reason, detail: normalizedDetail } : null;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npx tsx --test tests/reportForm.test.ts
```

Expected: 3 tests pass with exit code 0.

- [ ] **Step 5: Commit the model and test**

```powershell
git add -- frontend/utils/reportForm.ts frontend/tests/reportForm.test.ts
git commit -m "test: define shared report form"
```

---

### Task 3: Align recursive comment and reply rows

**Files:**
- Modify: `frontend/components/CommentItem.tsx:1-126`
- Modify: `frontend/tests/designBugVerification.test.ts`

**Interfaces:**
- Consumes: `getCommentActionState`, `commentEditSubmissionValue`, the current `CommentNode`, and callbacks from the post-detail route.
- Produces: `onEdit(commentId, content): Promise<void> | void`, `onOwnReport(): void`, and reference-aligned root/reply/edit states.

- [ ] **Step 1: Add a failing source-level visual wiring test**

In `frontend/tests/designBugVerification.test.ts`, add:

```ts
const commentItemSource = source("components/CommentItem.tsx");

test("댓글·대댓글 행은 승인된 수정·구분선·신고 상태를 연결한다", () => {
  assert.match(commentItemSource, /getCommentActionState/);
  assert.match(commentItemSource, /commentEditSubmissionValue/);
  assert.match(commentItemSource, /onOwnReport/);
  assert.match(commentItemSource, /borderBottomWidth: depth === 0 \? 1 : 0/);
  assert.match(commentItemSource, /borderColor: "#2761FF"/);
  assert.match(commentItemSource, /autoFocus/);
  assert.match(commentItemSource, /await onEdit\?\.\(comment\.id, next\)/);
});
```

- [ ] **Step 2: Run the source-level test and verify RED**

Run from `frontend/`:

```powershell
npx tsx --test --test-name-pattern="댓글·대댓글 행" tests/designBugVerification.test.ts
```

Expected: FAIL because `CommentItem` does not yet import or use the approved presentation model and blue edit styling.

- [ ] **Step 3: Update `CommentItem` state and callback contracts**

In `frontend/components/CommentItem.tsx`, keep the existing date and user-label
imports and add the presentation-model import shown here:

```ts
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { CommentNode } from "../types";
import {
  commentEditSubmissionValue,
  getCommentActionState,
} from "../utils/commentPresentation";
import { formatBoardDate, formatRelativeTime } from "../utils/dateFormat";
import { formatCohortName } from "../utils/userLabel";
```

Change the relevant props to:

```ts
onEdit?: (commentId: number, content: string) => Promise<void> | void;
onOwnReport?: () => void;
```

Add saving and action state inside the component:

```ts
const [isSaving, setIsSaving] = useState(false);
const actionState = getCommentActionState({
  depth,
  isMine,
  isEditing,
  isReported: Boolean(isReported),
});
const hasActionRow = actionState.showReply
  || actionState.showEdit
  || actionState.showDelete
  || actionState.showSave
  || actionState.showCancel;

const saveEdit = async () => {
  const next = commentEditSubmissionValue(draft, isSaving);
  if (!next || !onEdit) return;
  try {
    setIsSaving(true);
    await onEdit?.(comment.id, next);
    setIsEditing(false);
  } catch {
    // The route owns user-facing error feedback; keep the draft open for retry.
  } finally {
    setIsSaving(false);
  }
};
```

- [ ] **Step 4: Align root/reply containers and edit input geometry**

Replace the outer row style with these exact values:

```tsx
style={{
  marginLeft: depth * 14,
  marginTop: depth > 0 ? 8 : 0,
  paddingTop: 12,
  paddingBottom: depth === 0 ? 16 : 12,
  paddingHorizontal: depth > 0 ? 12 : 0,
  borderBottomWidth: depth === 0 ? 1 : 0,
  borderBottomColor: "#EAECEF",
  borderRadius: depth > 0 ? 8 : 0,
  backgroundColor: depth > 0 ? "#F7F7F8" : undefined,
}}
```

Replace edit-mode input styling and behavior with:

```tsx
<TextInput
  autoFocus
  maxLength={500}
  multiline
  onChangeText={setDraft}
  style={[
    {
      marginTop: 8,
      minHeight: 52,
      borderWidth: 1.5,
      borderColor: "#2761FF",
      borderRadius: 8,
      color: "#15171C",
      fontSize: 13,
      lineHeight: 20,
      paddingHorizontal: 10,
      paddingVertical: 9,
      textAlignVertical: "top",
    },
    { outlineStyle: "none" } as never,
  ]}
  value={draft}
/>
```

- [ ] **Step 5: Render the uniform report label with safe own-comment behavior**

Replace the header's conditional report block with:

```tsx
<Pressable
  accessibilityRole="button"
  disabled={actionState.reportAction === "none"}
  onPress={() => {
    if (actionState.reportAction === "own-unavailable") {
      onOwnReport?.();
      return;
    }
    if (actionState.reportAction === "open") {
      onReport?.({ type: "comment", id: comment.id, label: `댓글 #${comment.id}` });
    }
  }}
>
  <Text
    style={{
      color: actionState.reportAction === "none" ? "#15803D" : "#A6ACB7",
      fontSize: 11,
      fontWeight: "400",
    }}
  >
    {actionState.reportLabel}
  </Text>
</Pressable>
```

- [ ] **Step 6: Render only the action model's approved text actions**

Replace the action row with:

```tsx
{hasActionRow ? (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
    {actionState.showReply && onReply ? (
      <Pressable onPress={() => onReply(comment)}>
        <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>답글</Text>
      </Pressable>
    ) : null}

    {actionState.showSave ? (
      <Pressable disabled={isSaving} onPress={saveEdit}>
        <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>
          {isSaving ? "저장 중" : "저장"}
        </Text>
      </Pressable>
    ) : null}

    {actionState.showCancel ? (
      <Pressable
        disabled={isSaving}
        onPress={() => {
          setDraft(comment.content);
          setIsEditing(false);
        }}
      >
        <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "500" }}>취소</Text>
      </Pressable>
    ) : null}

    {actionState.showEdit ? (
      <Pressable
        onPress={() => {
          setDraft(comment.content);
          setIsEditing(true);
        }}
      >
        <Text style={{ color: "#2761FF", fontSize: 12, fontWeight: "500" }}>수정</Text>
      </Pressable>
    ) : null}

    {actionState.showDelete ? (
      <Pressable onPress={() => onDelete?.(comment.id)}>
        <Text style={{ color: "#D64545", fontSize: 12, fontWeight: "500" }}>삭제</Text>
      </Pressable>
    ) : null}
  </View>
) : null}
```

Pass `onOwnReport={onOwnReport}` to every recursive child `CommentItem`.

- [ ] **Step 7: Run focused and model tests and verify GREEN**

Run:

```powershell
npx tsx --test tests/commentPresentation.test.ts tests/designBugVerification.test.ts
npm run typecheck
```

Expected: comment-presentation tests and the source-level visual test pass; TypeScript exits 0.

- [ ] **Step 8: Commit the comment row integration**

```powershell
git add -- frontend/components/CommentItem.tsx frontend/tests/designBugVerification.test.ts
git commit -m "feat: align comment and reply rows"
```

---

### Task 4: Wire the shared report model and align overlays

**Files:**
- Modify: `frontend/app/board/post/[postId].tsx:39-95,179-181,392-420,950-1152,1216-1465`
- Modify: `frontend/tests/designBugVerification.test.ts`

**Interfaces:**
- Consumes: `COMMENT_DELETE_COPY`, `REPORT_REASONS`, `ReportReason`, `getReportSubmission`, and the async `CommentItem.onEdit` callback.
- Produces: shared post/comment report submission, own-comment local feedback, exact delete copy, and consistent bottom-sheet/modal geometry.

- [ ] **Step 1: Add failing source-level integration checks**

Extend `frontend/tests/designBugVerification.test.ts` with:

```ts
test("게시글·댓글 신고와 삭제 오버레이는 승인된 공용 모델과 크기를 사용한다", () => {
  assert.match(postDetailSource, /getReportSubmission/);
  assert.match(postDetailSource, /COMMENT_DELETE_COPY\.title/);
  assert.match(postDetailSource, /COMMENT_DELETE_COPY\.body/);
  assert.match(postDetailSource, /본인 댓글은 신고할 수 없어요\./);
  assert.match(postDetailSource, /mutateAsync\(\{ commentId, content \}\)/);
  assert.match(postDetailSource, /confirmCard:[\s\S]*maxWidth: 272/);
  assert.match(postDetailSource, /reportSheet:[\s\S]*paddingHorizontal: 16/);
});
```

- [ ] **Step 2: Run the integration check and verify RED**

Run from `frontend/`:

```powershell
npx tsx --test --test-name-pattern="게시글·댓글 신고와 삭제" tests/designBugVerification.test.ts
```

Expected: FAIL because the route still owns inline report constants, old comment-delete copy, and the wider confirmation card.

- [ ] **Step 3: Replace inline report constants with the tested model**

Add imports:

```ts
import { COMMENT_DELETE_COPY } from "../../../utils/commentPresentation";
import {
  REPORT_REASONS,
  getReportSubmission,
  type ReportReason,
} from "../../../utils/reportForm";
```

Delete the local `REPORT_REASONS` declaration. Type the state and derive the payload:

```ts
const [reportReason, setReportReason] = useState<ReportReason>(REPORT_REASONS[0].value);
const reportSubmission = getReportSubmission(reportReason, reportDetail);
const canSubmitReport = reportSubmission !== null;
```

Update `submitReport` to guard on `reportSubmission` and send it directly:

```ts
const submitReport = async () => {
  if (!reportTarget || !reportSubmission || !requireLogin()) return;
  try {
    setIsReporting(true);
    const response = reportTarget.type === "post"
      ? await reportApi.reportPost(reportTarget.id, reportSubmission)
      : await reportApi.reportComment(reportTarget.id, reportSubmission);
    setReportedTargets((current) => ({ ...current, [`${reportTarget.type}:${reportTarget.id}`]: true }));
    setReportTarget(null);
    setReportDetail("");
    Alert.alert(response.data.duplicate ? "이미 신고됨" : "신고 접수 완료", "검토 후 조치하겠습니다.");
  } catch {
    Alert.alert("신고 실패", "신고 내용을 확인하거나 잠시 후 다시 시도하세요.");
  } finally {
    setIsReporting(false);
  }
};
```

- [ ] **Step 4: Wire async edit retry and own-comment report feedback**

Replace the `CommentItem` edit callback with:

```tsx
onEdit={async (commentId, content) => {
  try {
    await updateCommentMutation.mutateAsync({ commentId, content });
  } catch (error) {
    Alert.alert("댓글 수정 실패", "댓글을 수정할 수 없습니다.");
    throw error;
  }
}}
onOwnReport={() => Alert.alert("신고할 수 없어요", "본인 댓글은 신고할 수 없어요.")}
```

Keep `onReport={startReport}` for other authors.

- [ ] **Step 5: Use the approved comment-delete copy and pending guards**

Render:

```tsx
<Text style={styles.confirmTitle}>{COMMENT_DELETE_COPY.title}</Text>
<Text style={styles.confirmBody}>{COMMENT_DELETE_COPY.body}</Text>
```

Keep `closeCommentDeleteConfirm` as the backdrop and cancel handler so its existing pending guard prevents closing during deletion. For post deletion, change backdrop and cancel handlers to call `setShowDeleteConfirm(false)` only when `deletePostMutation.isPending` is false.

- [ ] **Step 6: Align sheet and confirmation geometry**

Set these exact style values:

```ts
menuSheet: {
  width: "100%",
  maxWidth: 480,
  alignSelf: "center",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  backgroundColor: COLORS.surface,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
},
reportSheet: {
  width: "100%",
  maxWidth: 480,
  alignSelf: "center",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  backgroundColor: COLORS.surface,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
},
confirmCard: {
  width: "100%",
  maxWidth: 272,
  borderRadius: 16,
  backgroundColor: COLORS.surface,
  padding: 20,
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 12,
},
```

Render the report detail input with the web outline removed:

```tsx
<TextInput
  maxLength={1000}
  multiline
  value={reportDetail}
  onChangeText={setReportDetail}
  placeholder="구체적인 사유를 입력해주세요"
  placeholderTextColor={COLORS.subtle}
  style={[styles.reportDetailInput, { outlineStyle: "none" } as never]}
  textAlignVertical="top"
/>
```

Apply `styles.sheetMenuItemLast` to the last visible post-action row with these
exact conditions:

```tsx
// 수정 row
style={[
  styles.sheetMenuItem,
  !canDeleteOwn && !showReportItem && !showBlockItem ? styles.sheetMenuItemLast : null,
]}

// 삭제 row
style={[
  styles.sheetMenuItem,
  !showReportItem && !showBlockItem ? styles.sheetMenuItemLast : null,
]}

// 신고 row
style={[
  styles.sheetMenuItem,
  !showBlockItem ? styles.sheetMenuItemLast : null,
]}

// 작성자 차단 row
style={[styles.sheetMenuItem, styles.sheetMenuItemLast]}
```

- [ ] **Step 7: Run focused tests and typecheck and verify GREEN**

Run:

```powershell
npx tsx --test tests/commentPresentation.test.ts tests/reportForm.test.ts tests/designBugVerification.test.ts
npm run typecheck
```

Expected: all focused tests pass and TypeScript exits 0.

- [ ] **Step 8: Commit the shared overlay integration**

```powershell
git add -- ':(literal)frontend/app/board/post/[postId].tsx' frontend/tests/designBugVerification.test.ts
git commit -m "feat: align post and comment overlays"
```

---

### Task 5: Full verification, mobile visual comparison, and contract notes

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:133-152`
- Modify: `CODEX.md:90-100`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a009ad-f8b1-7181-8ddb-0cb398673502/comment-edit.png`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a009ad-f8b1-7181-8ddb-0cb398673502/comment-delete.png`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a009ad-f8b1-7181-8ddb-0cb398673502/report-default.png`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a009ad-f8b1-7181-8ddb-0cb398673502/report-other.png`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a009ad-f8b1-7181-8ddb-0cb398673502/post-actions.png`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a009ad-f8b1-7181-8ddb-0cb398673502/post-delete.png`

**Interfaces:**
- Consumes: the completed UI, isolated QA stack, seeded accounts, and supplied reference capture.
- Produces: fresh automated verification evidence, six visual-state captures, and updated implementation records.

- [ ] **Step 1: Run the complete frontend verification suite**

Run from `frontend/`:

```powershell
npm run test
npm run typecheck
npm run lint
```

Expected: every test passes; typecheck and lint exit 0 with no errors or warnings.

- [ ] **Step 2: Start the isolated QA stack**

Run from the repository root:

```powershell
.\scripts\qa-compose.ps1 -Action Up
```

Expected: the script reports the frontend healthy at `http://localhost:58081` and the API healthy at `http://localhost:58000`.

- [ ] **Step 3: Reproduce the six approved states at mobile width**

Use the local seeded admin account `test@sogang.ac.kr` / `password123` and the seeded member account `mate71@sogang.ac.kr` / `password123` as needed to create own and other-author rows. At a 360px-wide browser viewport, open a comment-enabled post and capture:

1. an owner comment in edit mode;
2. the comment-delete confirmation;
3. the shared report sheet with the default reason;
4. the shared report sheet with `기타` and its detail field;
5. the post action sheet;
6. the post-delete confirmation.

Save each capture to the exact paths listed above. Do not include passwords, access tokens, email input fields, or private data in any capture.

- [ ] **Step 4: Compare and adjust against the supplied reference**

For each capture, compare action placement, root divider, reply indentation/background, blue edit border, sheet handle, reason row height, radio size, `기타` field, primary button, confirmation width, radii, overlay opacity, and destructive colors. If a material mismatch remains, add a failing source/model assertion where possible, make the smallest style correction, rerun the focused test, and recapture the affected state.

- [ ] **Step 5: Record the implemented contract**

Add to the post-detail requirements in `docs/phase2/FRONTEND_ROUTE_SPEC.md`:

```markdown
- Comment rows use root dividers and indented neutral reply containers. Owner edit mode uses the primary-blue field with only `저장`/`취소`; ordinary owner mode exposes the applicable `답글`/`수정`/`삭제` actions. The right-aligned report entry remains visually consistent on every row, while own-comment attempts are stopped locally because the API forbids self-reporting.
- Post and comment reports share the approved radio-reason bottom sheet. `기타` reveals a required detail field; the default selected reason and all Korean copy follow the captured UI. Comment and post destructive confirmations use the same centered overlay language.
```

Add to the completed baseline list in `CODEX.md`:

```markdown
- Completed P0 comment/report UI alignment: root and reply rows, inline edit state, owner actions, comment deletion, shared post/comment report reasons, post actions, and destructive confirmations now match the approved mobile capture while preserving two-depth and self-report permission rules.
```

- [ ] **Step 6: Re-run final verification after documentation and visual corrections**

Run from `frontend/`:

```powershell
npm run test
npm run typecheck
npm run lint
```

Then run from the repository root:

```powershell
git diff --check
git status --short
```

Expected: tests, typecheck, and lint exit 0; `git diff --check` emits no errors; status lists only this task's documentation changes plus the pre-existing unrelated untracked user files.

- [ ] **Step 7: Commit the verified contract notes**

```powershell
git add -- docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "docs: record comment report ui alignment"
```

- [ ] **Step 8: Stop the isolated QA stack if this task started it**

```powershell
.\scripts\qa-compose.ps1 -Action Down
```

Expected: QA containers stop while isolated QA database and media volumes remain preserved.
