# Comment, Reply, and Report UI Alignment Design

**Date:** 2026-08-16
**Priority:** P0 community UX polish
**Scope:** Shared post-detail comments, replies, report sheets, and destructive confirmations

## Problem

The existing post-detail screen already supports two-depth comments, reply
composition, inline editing, owner deletion, and a shared post/comment report
sheet. Its behavior is largely complete, but several states do not visually
match the approved reference capture: root comments lack clear separators, the
edit field uses a neutral border instead of the selected blue treatment, edit
actions can compete with reply actions, and the comment-delete confirmation copy
is shorter than the reference.

The report form already has the required radio reasons and conditional `기타`
detail field. This work aligns that shared form and its surrounding post/comment
entry points to one consistent visual treatment without replacing the existing
API or navigation architecture.

## Approved Behavior

### Comment and reply rows

- Keep the backend-enforced two-depth model: a root comment can receive a reply,
  and a reply cannot receive another nested reply.
- Show the visible cohort-and-author label, content, approved date metadata, and
  a right-aligned `신고` label in the same positions as the reference.
- Separate root comments with a thin divider.
- Render replies as indented rounded light-gray rows beneath their root comment.
- In the ordinary owner state, show the applicable `답글`, `수정`, and `삭제`
  text actions on one compact row.
- In edit state, replace comment content with a full-width text field using the
  primary blue border and show only `저장` and `취소` as edit actions.
- Trim edited content and do not submit blank text. Preserve the current draft
  and edit state when the update request fails so the member can retry.
- Keep the existing named reply-target strip and reply-specific placeholder.
  Cancelling or successfully submitting restores ordinary comment composition.

### Comment report entry point

- Display the `신고` label in the reference position for every comment row so
  owner and non-owner layouts remain visually consistent.
- Preserve the API rule that a member cannot report their own comment. Selecting
  `신고` on the member's own comment shows `본인 댓글은 신고할 수 없어요.` and
  does not open the report sheet or send a request.
- Selecting `신고` on another member's comment opens the shared report sheet with
  that comment as the target.
- After a successful report, keep the existing submitted-state feedback and do
  not send duplicate reports.

### Shared post and comment report sheet

- Use the same bottom-anchored sheet for post and comment reports.
- Keep the post-menu `신고` row visible for visual consistency, including on an owner post. Selecting it on the member's own post shows `본인 게시글은 신고할 수 없어요.` without opening the sheet or sending a request.
- Show a centered drag handle, `신고하기` title, and
  `신고 사유를 선택해주세요` subtitle.
- Present these radio rows in this order:
  1. `스팸/광고입니다`
  2. `욕설 및 비방이 포함되어 있어요`
  3. `허위 정보예요`
  4. `기타`
- Select the first reason when the sheet opens.
- When `기타` is selected, show a multiline field with the placeholder
  `구체적인 사유를 입력해주세요`.
- Disable `제출` until a nonblank `기타` detail exists. Other reasons can be
  submitted without detail.
- Disable repeat submission while a report request is pending. On failure, keep
  the chosen reason and detail so the member can retry.
- Tapping the dimmed backdrop closes the sheet; interaction inside the sheet does
  not close it.

### Delete and post-action overlays

- The comment confirmation title is `댓글 삭제` and its body is
  `댓글을 삭제하시겠어요?` followed by `삭제한 댓글은 복구할 수 없어요.`.
- Keep `취소` as the neutral outlined action and `삭제` as the red destructive
  action. Disable closing and repeat deletion while the request is pending.
- Preserve the existing inline error message when comment deletion fails.
- Keep the post action sheet and post-delete confirmation behavior, but align
  their handle, row spacing, dividers, radii, overlay, and destructive colors to
  the same reference geometry used by the report and comment-delete states.

## Visual Treatment

The implementation uses the current app palette and typography as the source of
truth while matching the capture's spacing and hierarchy. Root dividers use the
existing light divider color. Reply containers use a subtle neutral surface.
Focused edit inputs and selected report controls use the existing primary blue.
Delete labels and buttons use the existing destructive red. Overlay cards keep
the existing centered, rounded, elevated presentation, and bottom sheets remain
anchored to the viewport bottom with a mobile-width cap on web.

The target is state-for-state visual parity with the supplied reference at a
mobile viewport. Platform font rasterization and system keyboard geometry may
vary, but component dimensions, copy, color roles, borders, spacing, and action
placement must remain consistent across native and web.

## Considered Approaches

### 1. Targeted alignment in the existing screen (selected)

Adjust `CommentItem` presentation and the existing shared overlays in the
post-detail route. Extract only small pure presentation/form helpers needed for
reliable regression tests. This preserves working API integration and minimizes
the risk of breaking a large, shared post-detail route.

### 2. Extract all comment and report UI into new components

Dedicated row, action, sheet, and confirmation components would reduce the size
of the post-detail route, but it would mix a broad structural refactor with a
visual-alignment task. That creates unnecessary review and regression surface.

### 3. Add separate report routes

Dedicated post and comment report screens would isolate state, but the approved
capture and current product both use a bottom sheet. New routes would change
navigation and duplicate shared form behavior without user value.

## Data Flow and Error Handling

Comment and reply payloads, report payloads, and deletion requests keep their
current API shapes. UI state determines which row actions are visible and
whether the report sheet can open. The report target continues to distinguish
`post` from `comment`, so the same form submits through the appropriate existing
endpoint.

Blank edits and incomplete `기타` reports are rejected before network calls.
Pending mutations disable their destructive or submit controls. Update, report,
and delete failures keep enough local state for retry and use the existing
in-app feedback patterns. No backend, database, migration, permission, or
response-envelope change is part of this work.

## Tests and Verification

Regression coverage will prove that:

1. Root, reply, owner, edit, and report action states follow the approved rules.
2. Edit mode exposes only `저장` and `취소` and rejects blank content.
3. The report reason order and copy match the reference.
4. `기타` requires nonblank detail while other reasons do not.
5. An own-comment report selection produces the local policy message without a
   report target.
6. Comment-delete title and body copy match the approved confirmation.

Verification includes the focused regression tests, complete frontend test
suite, TypeScript typecheck, ESLint, and mobile-width browser captures of comment
edit, comment delete, report default, report `기타`, post action, and post delete
states. Captures are compared against the supplied reference and adjusted when
spacing, sizing, or hierarchy differs materially.

## Scope Boundaries

- No backend, database, migration, API contract, or permission change.
- No change to comment ordering, pagination, notification triggers, or author
  identity rules.
- No new report reasons or moderation workflow.
- No change to boards where comments are disabled.
- No unrelated post-detail redesign.
