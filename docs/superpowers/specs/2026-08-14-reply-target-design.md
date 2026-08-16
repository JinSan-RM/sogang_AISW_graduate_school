# Issue #104 Reply Target Composer Design

**Date:** 2026-08-14
**Priority:** P1 / medium
**Scope:** Frontend post-detail comment composer only

## Problem

The shared post-detail screen stores only the selected parent comment ID while
the member writes a reply. The composer then renders that internal API value as
`#248 답글 작성 중`. A member cannot infer who `#248` refers to, and the raw
identifier makes the reply state look inconsistent with the rest of the comment
UI.

The numeric value is still required as `parent_id` when the reply is submitted,
but it must not be presented as user-facing copy.

## Approved Behavior

- Replace the numeric notice with a compact reply-target strip above the comment
  input.
- Display the same visible cohort-and-name label used by the selected comment,
  for example `↳ 72기 김진산님에게 답글`.
- Do not include `작성 중` in the reply-target copy.
- Keep a visible `취소` action on the right side of the strip.
- Change the input placeholder from `댓글을 남겨보세요` to
  `답글을 남겨보세요` while a reply target is selected.
- Cancelling restores the ordinary comment composer and its original
  placeholder.
- Submitting a reply clears the target and restores the ordinary comment
  composer, as it does today.
- Preserve the existing visible identity policy. Anonymous or historical author
  labels must use the same value already shown on the comment; no hidden account
  identity is revealed.
- Never render the internal parent comment ID in the reply-target UI.

## Visual Treatment

The reply-target strip sits directly above the existing comment input row inside
the fixed composer. It uses a subtle light background, compact vertical padding,
and the existing rounded styling language. The target text uses the primary
accent at normal medium emphasis, while `취소` remains a lower-emphasis text
action. The existing input and send button geometry stay unchanged.

The strip is shown only when a reply target exists, so ordinary comment writing
does not gain any additional permanent UI.

## Considered Approaches

### 1. Named reply-target strip (selected)

Show the visible comment author label plus `님에게 답글`, provide a dedicated
cancel action, and switch the placeholder to reply wording. This makes both the
target and the exit action explicit without exposing implementation details.

### 2. Generic `답글` state only

Showing only `답글` or changing only the placeholder is visually minimal, but a
member cannot confirm which comment will receive the reply after scrolling.

### 3. Quoted comment preview

Showing the target author's name and an excerpt of the original comment provides
more context, but it adds height and truncation behavior to a compact fixed
composer. That complexity is unnecessary for the current two-depth comment
model.

## Data Flow

When a member selects `답글` on a top-level comment, the frontend keeps both the
comment ID required by the API and the already-visible author label required by
the composer. The UI renders only the label. Submission continues to send only
the numeric ID as `parent_id`, preserving the existing API contract and backend
validation.

The reply-target state is cleared on cancel and after successful submission. A
failed submission retains the selected target and draft text so the member can
retry.

## Scope Boundaries

- No backend, database, migration, or API response changes.
- No change to the two-depth reply restriction.
- No change to comment cards, comment editing, deletion, reporting, or reply
  ordering.
- No redesign of the ordinary comment input or send button.

## Tests

Regression coverage will prove that:

1. Selecting a comment creates a reply target with its visible cohort-and-name
   label and internal ID.
2. Reply-target copy contains the visible label and does not contain the numeric
   ID or `작성 중`.
3. Reply mode uses `답글을 남겨보세요`; ordinary mode keeps
   `댓글을 남겨보세요`.
4. Cancelling and successful submission clear the reply target.
5. Reply submission still sends the correct numeric `parent_id`.

Verification will include the focused regression test, the complete frontend
test suite, TypeScript typecheck, ESLint, and a diff review for unrelated UI
changes.
