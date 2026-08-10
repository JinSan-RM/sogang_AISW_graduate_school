# Club Activity Source Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the current linked club recruitment title on club activity-certification list badges, with safe legacy fallbacks.

**Architecture:** The board-list API bulk-resolves `metadata.activity_source_post_id` values only for `club-activity` and returns an optional `activity_source_title`. A frontend resolver applies the approved priority order and the activity tile uses it only for the club activity board.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, pytest, React Native/Expo Router, TypeScript, Node test runner.

## Global Constraints

- Resolve only active, published, non-deleted posts from the active `club-promo` board.
- Do not issue one source-post query per activity card.
- Label priority is API source title, specific category, specific `metadata.legacy_activity_name`, then `동아리 활동 인증`.
- `동아리 활동 인증`, `활동 인증`, and `안내` are generic and cannot win a specific fallback slot.
- Study and networking activity badge behavior stays unchanged.
- Preserve all unrelated worktree changes and stage only task-owned hunks.

---

### Task 1: Bulk-resolve linked recruitment titles in the post-list API

**Files:**
- Create: `backend/tests/test_club_activity_source_title.py`
- Modify: `backend/app/routers/posts.py`
- Modify: `docs/phase2/API_CONTRACT.md`

**Interfaces:**
- Consumes: activity post metadata key `activity_source_post_id` containing a positive integer or numeric string.
- Produces: optional response item field `activity_source_title: str | None`.

- [ ] **Step 1: Write the failing API test**

Create an active `club-promo` board and `club-activity` board. Add a recruitment post titled `AI 연구 동아리`, a linked activity whose category is stale, and activities linked to a deleted or wrong-board source. Assert the list item for the valid link has `activity_source_title == "AI 연구 동아리"` and invalid links return `None`.

```python
response = api.client.get(f"/api/boards/{activity_board_id}/posts", headers=api.headers["owner"])
items = {item["id"]: item for item in response.json()["data"]}
assert items[linked_id]["activity_source_title"] == "AI 연구 동아리"
assert items[wrong_board_id]["activity_source_title"] is None
assert items[deleted_source_id]["activity_source_title"] is None
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `python -m pytest backend/tests/test_club_activity_source_title.py -q`

Expected: FAIL because `activity_source_title` is absent.

- [ ] **Step 3: Add one bulk lookup and attach the optional field**

In `backend/app/routers/posts.py`, parse positive source IDs from the already-fetched activity rows. Run one `select(Post.id, Post.title).join(Board)` query restricted to `Board.slug == "club-promo"`, `Board.is_active.is_(True)`, `Post.status == "published"`, and `Post.deleted_at.is_(None)`. Build a source-ID-to-title map and return the mapped title on each `club-activity` list item.

```python
source_titles = _club_activity_source_titles(db, board, [row[0] for row in rows])
"activity_source_title": source_titles.get(_activity_source_post_id(post)),
```

- [ ] **Step 4: Run the focused backend test and verify GREEN**

Run: `python -m pytest backend/tests/test_club_activity_source_title.py -q`

Expected: PASS.

- [ ] **Step 5: Document and commit the API slice**

Add `activity_source_title` to the post-list response example and document its club-only linked-title semantics.

```powershell
git add backend/app/routers/posts.py backend/tests/test_club_activity_source_title.py docs/phase2/API_CONTRACT.md
git commit -m "feat(api): resolve club activity source titles"
```

### Task 2: Resolve the displayed club badge label

**Files:**
- Modify: `frontend/tests/activityCertification.test.ts`
- Modify: `frontend/utils/activityCertification.ts`
- Modify: `frontend/types/index.ts`

**Interfaces:**
- Consumes: `PostListItem.activity_source_title`, category, and `metadata.legacy_activity_name`.
- Produces: `activityCertificationBadgeLabel(post, boardSlug): string`.

- [ ] **Step 1: Write failing table-driven resolver tests**

Use literal expected values for current source title, specific category fallback, legacy-name fallback, final generic fallback, and unchanged study behavior.

```typescript
assert.equal(activityCertificationBadgeLabel({ activity_source_title: "현재 동아리명", category: "예전 이름" }, "club-activity"), "현재 동아리명");
assert.equal(activityCertificationBadgeLabel({ category: "동아리 활동 인증", metadata: { legacy_activity_name: "AI 연구회" } }, "club-activity"), "AI 연구회");
assert.equal(activityCertificationBadgeLabel({ category: "활동 인증" }, "club-activity"), "동아리 활동 인증");
assert.equal(activityCertificationBadgeLabel({ category: "스터디 활동 인증" }, "study-activity"), "스터디 활동 인증");
```

- [ ] **Step 2: Run the frontend focused test and verify RED**

Run: `npx tsx --test tests/activityCertification.test.ts`

Working directory: `frontend`

Expected: FAIL because `activityCertificationBadgeLabel` is not exported.

- [ ] **Step 3: Implement the minimal resolver and response type**

Add `activity_source_title?: string | null` to `PostListItem`. Implement trimmed-string and generic-label checks in `activityCertification.ts`. For non-club boards return the existing trimmed category or `활동 인증`.

```typescript
export function activityCertificationBadgeLabel(post: ActivityBadgePost, boardSlug?: string): string {
  if (boardSlug !== "club-activity") return specificText(post.category) ?? "활동 인증";
  return specificText(post.activity_source_title)
    ?? specificNonGenericText(post.category)
    ?? specificNonGenericText(post.metadata?.legacy_activity_name)
    ?? "동아리 활동 인증";
}
```

- [ ] **Step 4: Run the focused frontend test and verify GREEN**

Run: `npx tsx --test tests/activityCertification.test.ts`

Working directory: `frontend`

Expected: PASS.

- [ ] **Step 5: Commit the resolver slice without participant-guidance hunks**

Stage only the new resolver/test hunks from already-dirty activity-certification files, plus the clean type file.

```powershell
git add -p -- frontend/utils/activityCertification.ts frontend/tests/activityCertification.test.ts
git add frontend/types/index.ts
git diff --cached --check
git commit -m "feat(frontend): resolve club activity badge labels"
```

### Task 3: Render the resolved badge and verify the vertical slice

**Files:**
- Modify: `frontend/app/board/[boardId].tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: `activityCertificationBadgeLabel(post, board?.slug)`.
- Produces: the visible blue pill text for each activity card.

- [ ] **Step 1: Replace the activity tile's inline category fallback**

Pass the current board slug into `ActivityTile` and render the resolver result.

```tsx
<Text style={styles.activityPillText}>{activityCertificationBadgeLabel(post, boardSlug)}</Text>
```

- [ ] **Step 2: Run frontend tests and typecheck**

Run in `frontend`:

```powershell
npm test
npm run typecheck
```

Expected: all tests and typecheck pass.

- [ ] **Step 3: Update route/backlog documentation**

Document that club activity list pills prefer the current linked `club-promo` title and fall back safely for legacy records. Add the completed work-package note without staging unrelated participant-guidance documentation.

- [ ] **Step 4: Run backend regression and frontend static checks**

Run:

```powershell
python -m pytest backend/tests/test_club_activity_source_title.py backend/tests/test_activity_certification_edit.py -q
Set-Location frontend
npm run lint
npm run export:web
```

Expected: zero failures/errors and successful web export.

- [ ] **Step 5: Commit the rendering/docs slice**

```powershell
git add frontend/app/board/[boardId].tsx
git add -p -- docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git diff --cached --check
git commit -m "feat(frontend): show club names on activity cards"
```
