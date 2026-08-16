# Issue #92 Resource Author-Block Menu Design

**Date:** 2026-08-14  
**Priority:** P0 / high  
**Scope:** Frontend post-detail action policy only

## Problem

The shared post-detail screen currently shows `작성자 차단` whenever a post has
an identifiable author, belongs to another member, is not a suggestion, and is
not on an administrator-only board. `comprehensive-exam` and
`graduation-thesis` are member-writable resource boards, so they satisfy that
generic condition even though their approved detail designs do not contain an
author-block action.

## Approved Behavior

- Hide `작성자 차단` in the post-detail more menu for:
  - `comprehensive-exam`
  - `graduation-thesis`
- Preserve existing edit, delete, and report actions.
- Preserve author blocking on other eligible member boards.
- Preserve all backend block APIs, block settings, and existing block-based
  filtering. This issue changes where a new block can be initiated, not the
  meaning of an existing block.
- Make no layout, style, or copy changes beyond omitting the disallowed menu
  row.

## Considered Approaches

### 1. Tested pure menu-policy helper (selected)

Move the author-block visibility decision into a small pure frontend utility.
The helper receives the existing permission facts plus the board slug and
returns whether the row is allowed. The detail screen renders from that result.

This keeps the exception explicit and makes the policy independently testable
without rendering the large shared detail screen.

### 2. Inline slug check in the detail screen

This is the smallest textual change, but it leaves the policy embedded in a
large component and encourages source-text tests instead of behavior tests.

### 3. Backend-provided action capability

The API could return a per-post `can_block_author` field. That would be useful
if blocking were an authorization boundary, but issue #92 only corrects a
frontend design action. Adding an API contract and response field would be
unnecessary scope.

## Implementation

Add a frontend menu-policy utility that preserves the current generic checks
and also rejects the two resource slugs. Replace the inline `showBlockItem`
expression in the shared post-detail screen with the helper result.

No backend, database, route, or visual component changes are required.

## Tests

The regression suite will prove that:

1. `comprehensive-exam` does not show the author-block action.
2. `graduation-thesis` does not show the author-block action.
3. An ordinary eligible member board still shows the action.
4. Existing exclusions for missing authors, own posts, manageable posts,
   suggestions, and administrator-only boards remain intact.

Verification includes the focused policy test, the complete frontend test
suite, TypeScript typecheck, ESLint, and a diff review confirming that no
unrelated UI code changed.
