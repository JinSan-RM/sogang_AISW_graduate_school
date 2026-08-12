# Resource Post Move Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every moved resource post appear in its target resource-board tab with the target board's tag across list, detail, and My Activity.

**Architecture:** Treat the resolved resource board as the authoritative source of the post category. The backend canonicalizes category on create and update, while one frontend resource helper derives display and edit-payload labels from the current board so previously stale records also render correctly.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy 2.0, pytest, React Native, Expo Router, TypeScript, Node test runner through `tsx`.

## Global Constraints

- Canonical mappings are `lecture-reviews` → `강의후기`, `exam-archive` → `시험족보`, `comprehensive-exam` → `종합시험`, and `graduation-thesis` → `졸업논문`.
- Moving remains limited to active boards where `category == "resources"` and `board_type == "resource"`.
- Preserve the post ID, attachments, comments, likes, and bookmarks.
- Keep target-board read/write authorization unchanged.
- Keep non-resource category behavior unchanged.
- Existing stale resource categories must stop appearing in list, detail, and My Activity without a database migration.
- Work directly on the current `main` checkout; do not create a worktree or push.

---

### Task 1: Canonicalize Resource Categories in the API

**Files:**
- Modify: `backend/app/board_policies.py`
- Modify: `backend/app/routers/posts.py:1-20,875-1018`
- Modify: `backend/tests/test_resource_post_board_move.py`
- Modify: `docs/phase2/API_CONTRACT.md:888-914`

**Interfaces:**
- Consumes: a resolved `Board` and a client-submitted `category`.
- Produces: `canonical_post_category(board: Board, submitted_category: str | None) -> str | None`.

- [ ] **Step 1: Write failing API tests for all four target tags**

Extend `backend/tests/test_resource_post_board_move.py` with `pytest` parametrization. Create a source resource board with a stale category and a target using each production slug:

```python
import pytest


RESOURCE_TARGETS = [
    ("lecture-reviews", "강의후기"),
    ("exam-archive", "시험족보"),
    ("comprehensive-exam", "종합시험"),
    ("graduation-thesis", "졸업논문"),
]


@pytest.mark.parametrize(("target_slug", "expected_category"), RESOURCE_TARGETS)
def test_resource_move_replaces_stale_category_with_target_board_tag(
    api,
    target_slug: str,
    expected_category: str,
) -> None:
    source_id, target_id, post_id = _create_resource_post(
        api,
        source_slug=f"source-{target_slug}",
        source_name="이전 자료",
        target_slug=target_slug,
        target_name=expected_category,
        post_category="이전 태그",
    )

    response = api.client.put(
        f"/api/posts/{post_id}",
        json={**_update_payload(board_id=target_id), "category": "이전 태그"},
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        post = db.get(Post, post_id)
        assert post is not None
        assert post.board_id == target_id
        assert post.category == expected_category
```

Update `_create_resource_post` to accept the exact source/target slug, name, and initial category while preserving defaults for the existing permission and related-data tests:

```python
def _create_resource_post(
    api,
    *,
    target_write_permission: str = "user",
    source_slug: str = "lecture-reviews-move-test",
    source_name: str = "Lecture Reviews",
    target_slug: str | None = None,
    target_name: str = "Exam Archive",
    post_category: str | None = None,
) -> tuple[int, int, int]:
    resolved_target_slug = target_slug or f"exam-archive-move-test-{target_write_permission}"
    with api.session() as db:
        source = Board(
            name=source_name,
            slug=source_slug,
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission="user",
            allow_anonymous=True,
        )
        target = Board(
            name=target_name,
            slug=resolved_target_slug,
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission=target_write_permission,
            allow_anonymous=True,
        )
        db.add_all([source, target])
        db.flush()
        post = Post(
            board_id=source.id,
            author_id=1,
            title="Original resource post",
            content="Resource body",
            category=post_category,
            comment_count=1,
            like_count=1,
        )
        db.add(post)
        db.flush()
        db.add_all(
            [
                Comment(post_id=post.id, author_id=2, content="Keep this comment"),
                Like(post_id=post.id, user_id=2),
                Bookmark(post_id=post.id, user_id=2),
                PostAttachment(post_id=post.id, media_id=1, sort_order=0),
            ]
        )
        db.commit()
        return source.id, target.id, post.id
```

Add a creation test and a non-resource control:

```python
def test_resource_create_uses_board_tag_instead_of_submitted_category(api) -> None:
    with api.session() as db:
        board = Board(
            name="시험족보",
            slug="exam-archive",
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission="user",
        )
        db.add(board)
        db.commit()
        board_id = board.id

    response = api.client.post(
        f"/api/boards/{board_id}/posts",
        json={
            "title": "새 자료",
            "content": "본문",
            "category": "이전 태그",
            "is_anonymous": False,
            "attachment_ids": [],
        },
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        assert db.get(Post, response.json()["data"]["id"]).category == "시험족보"


def test_non_resource_update_keeps_submitted_category(api) -> None:
    response = api.client.put(
        "/api/posts/3",
        json={
            "title": "Updated general post",
            "content": "Updated body",
            "category": "자유주제",
            "is_anonymous": False,
        },
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        assert db.get(Post, 3).category == "자유주제"
```

- [ ] **Step 2: Run the targeted backend tests and verify RED**

Run from `backend`:

```bash
python -m pytest tests/test_resource_post_board_move.py -q
```

Expected: the new resource assertions fail because the API stores the submitted stale category; existing move authorization tests pass.

- [ ] **Step 3: Implement the backend category policy**

Add to `backend/app/board_policies.py`:

```python
RESOURCE_CATEGORY_LABELS = {
    "lecture-reviews": "강의후기",
    "exam-archive": "시험족보",
    "comprehensive-exam": "종합시험",
    "graduation-thesis": "졸업논문",
}


def canonical_post_category(board: Board, submitted_category: str | None) -> str | None:
    if board.board_type == "album":
        return None
    if board.category == "resources" and board.board_type == "resource":
        return RESOURCE_CATEGORY_LABELS.get(board.slug, board.name)
    return submitted_category
```

Import it in `backend/app/routers/posts.py`:

```python
from app.board_policies import canonical_post_category, hides_author_identity
```

Use it in both mutations:

```python
category=canonical_post_category(board, payload.category),
```

```python
post.category = canonical_post_category(target_board, payload.category)
```

Keep `_upsert_suggestion_extension` and `_upsert_mutual_aid_extension` on their existing submitted category because they execute only for their non-resource board types.

- [ ] **Step 4: Run the targeted backend tests and verify GREEN**

Run:

```bash
python -m pytest tests/test_resource_post_board_move.py -q
```

Expected: all resource move, category, permission, and related-data tests pass.

- [ ] **Step 5: Update the API contract**

Append to the `PUT /posts/{post_id}` resource-move rule in `docs/phase2/API_CONTRACT.md`:

```md
For resource boards, the resolved target board is authoritative for `category`: `lecture-reviews`, `exam-archive`, `comprehensive-exam`, and `graduation-thesis` store `강의후기`, `시험족보`, `종합시험`, and `졸업논문` respectively. A stale or missing client category cannot override this mapping.
```

- [ ] **Step 6: Commit the API invariant**

```bash
git add backend/app/board_policies.py backend/app/routers/posts.py backend/tests/test_resource_post_board_move.py docs/phase2/API_CONTRACT.md
git commit -m "fix: canonicalize resource post categories"
```

### Task 2: Derive Resource Tags from the Current Board in the Frontend

**Files:**
- Modify: `frontend/utils/resourceBoards.ts`
- Modify: `frontend/tests/resourceBoards.test.ts`
- Modify: `frontend/components/PostCard.tsx`
- Modify: `frontend/app/board/post/[postId].tsx`
- Modify: `frontend/app/settings/activity.tsx`
- Create: `frontend/tests/resourceCategoryWiring.test.ts`

**Interfaces:**
- Consumes: current board `slug`, `name`, `board_type`, and `category` when available.
- Produces: `resourceCategoryLabel(board?: ResourceBoardIdentity | null): string | null`.

- [ ] **Step 1: Write failing helper tests**

Add to `frontend/tests/resourceBoards.test.ts`:

```ts
import { resourceCategoryLabel } from "../utils/resourceBoards";

test("자료공유 태그는 네 게시판 슬러그를 사용자용 이름으로 변환한다", () => {
  assert.equal(resourceCategoryLabel({ slug: "lecture-reviews" }), "강의후기");
  assert.equal(resourceCategoryLabel({ slug: "exam-archive" }), "시험족보");
  assert.equal(resourceCategoryLabel({ slug: "comprehensive-exam" }), "종합시험");
  assert.equal(resourceCategoryLabel({ slug: "graduation-thesis" }), "졸업논문");
});

test("자료공유 이름만 있는 내 활동 항목도 현재 게시판 태그를 사용한다", () => {
  assert.equal(resourceCategoryLabel({ name: "시험족보" }), "시험족보");
  assert.equal(resourceCategoryLabel({ name: "일반 게시판" }), null);
});

test("알 수 없는 자료공유 게시판은 게시판 이름으로 안전하게 표시한다", () => {
  assert.equal(
    resourceCategoryLabel({ name: "새 자료실", slug: "new-resource", category: "resources", board_type: "resource" }),
    "새 자료실"
  );
});
```

- [ ] **Step 2: Run the helper tests and verify RED**

Run from `frontend`:

```bash
npx tsx --test tests/resourceBoards.test.ts
```

Expected: FAIL because `resourceCategoryLabel` is not exported.

- [ ] **Step 3: Implement the shared helper**

Add to `frontend/utils/resourceBoards.ts`:

```ts
type ResourceBoardIdentity = Partial<Pick<Board, "slug" | "name" | "board_type" | "category">>;

export function resourceCategoryLabel(board?: ResourceBoardIdentity | null) {
  const slugLabel = board?.slug ? RESOURCE_SLUG_FILTERS[board.slug] : undefined;
  if (slugLabel) return slugLabel;

  const name = board?.name?.trim();
  if (name && RESOURCE_FILTER_SLUGS[name]) return name;
  if (board?.board_type === "resource" || board?.category === "resources") {
    return name || "자료";
  }
  return null;
}
```

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run:

```bash
npx tsx --test tests/resourceBoards.test.ts
```

Expected: all resource helper and board-option tests pass.

- [ ] **Step 5: Write failing wiring tests for stale categories**

Create `frontend/tests/resourceCategoryWiring.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const postCardSource = readFileSync("components/PostCard.tsx", "utf8");
const postDetailSource = readFileSync("app/board/post/[postId].tsx", "utf8");
const activitySource = readFileSync("app/settings/activity.tsx", "utf8");
const editSource = readFileSync("app/board/post/edit/[postId].tsx", "utf8");

test("자료공유 목록과 상세는 저장된 이전 분류보다 현재 게시판 태그를 우선한다", () => {
  assert.match(postCardSource, /resourceCategoryLabel\(\{ slug: boardSlug, board_type: boardType \}\)/);
  assert.match(postDetailSource, /const resourceLabel = resourceCategoryLabel\(board\)/);
  assert.match(postDetailSource, /: resourceLabel \?\?/);
});

test("내 활동과 수정 저장도 현재 자료공유 게시판 태그를 사용한다", () => {
  assert.match(activitySource, /resourceCategoryLabel\(\{ name: item\.board_name \}\)/);
  assert.match(editSource, /category: isResourceEdit\s*\? resourceCategoryLabel\(selectedBoard\) \?\? undefined\s*:/);
});
```

- [ ] **Step 6: Run the wiring tests and verify RED**

Run:

```bash
npx tsx --test tests/resourceCategoryWiring.test.ts
```

Expected: both tests fail because the four consumers do not use the shared helper.

- [ ] **Step 7: Wire the helper into list, detail, My Activity, and edit**

In `frontend/components/PostCard.tsx`, import the helper and add this before reading `post.category`:

```ts
  const resourceLabel = resourceCategoryLabel({ slug: boardSlug, board_type: boardType });
  if (resourceLabel) return resourceLabel;
```

In `frontend/app/board/post/[postId].tsx`, import the helper, calculate:

```ts
  const resourceLabel = resourceCategoryLabel(board);
```

and place `resourceLabel` before the study-recruit and generic category conditions:

```ts
      : resourceLabel ?? (
          board?.slug === "study-recruit"
            ? String(metadata.recruitment_status ?? post.category ?? "").toLowerCase().includes("closed") ||
                post.category?.includes("마감")
              ? "마감"
              : "진행중"
            : categoryLabel(
                post.category,
                isAdminParticipationGuide ? "모집중" : board?.board_type === "notice" ? "공지" : board?.name ?? "게시글"
              )
        );
```

Remove the old `post.category?.includes("종합")` resource override so stale content can no longer outrank the target board.

In `frontend/app/settings/activity.tsx`, import the helper and start `activityCategoryLabel` with:

```ts
  const resourceLabel = resourceCategoryLabel({ name: item.board_name });
  if (resourceLabel) return resourceLabel;
```

In `frontend/app/board/post/edit/[postId].tsx`, import the helper and change the payload category to:

```ts
        category: isResourceEdit
          ? resourceCategoryLabel(selectedBoard) ?? undefined
          : values.category?.trim() || undefined,
```

- [ ] **Step 8: Run all focused frontend tests and verify GREEN**

Run:

```bash
npx tsx --test tests/resourceBoards.test.ts tests/resourceCategoryWiring.test.ts
```

Expected: all resource mapping, option, and wiring tests pass.

- [ ] **Step 9: Commit the frontend normalization**

```bash
git add frontend/utils/resourceBoards.ts frontend/tests/resourceBoards.test.ts frontend/components/PostCard.tsx frontend/app/board/post/[postId].tsx frontend/app/settings/activity.tsx frontend/app/board/post/edit/[postId].tsx frontend/tests/resourceCategoryWiring.test.ts
git commit -m "fix: show target resource board tags"
```

### Task 3: Update Product Contracts and Verify the Full Change

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:74-86`
- Modify: `CODEX.md:104-106`
- Verify all Task 1 and Task 2 files.

**Interfaces:**
- Consumes: backend category invariant and frontend board-derived presentation.
- Produces: documented behavior plus fresh full-suite evidence.

- [ ] **Step 1: Update frontend and backlog contracts**

Append to the resource-sharing paragraph in `docs/phase2/FRONTEND_ROUTE_SPEC.md`:

```md
After a resource post moves, the target board controls its tag across the resource list, post detail, and My Activity; stale stored categories never override `강의후기`, `시험족보`, `종합시험`, or `졸업논문`.
```

Append to the resource-post edit entry in `CODEX.md`:

```md
The target resource board now canonicalizes the stored and displayed tag, so moved posts appear in the selected tab with the matching tag on list, detail, and My Activity surfaces.
```

- [ ] **Step 2: Run the full backend suite and compile check**

Run from `backend`:

```bash
python -m pytest -q
python -m compileall -q app
```

Expected: zero test failures and exit code 0 from compilation.

- [ ] **Step 3: Run the full frontend suite and type check**

Run from `frontend`:

```bash
npm test
npm run typecheck
```

Expected: zero test failures and no TypeScript errors.

- [ ] **Step 4: Commit the product contract updates**

```bash
git add docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "docs: record resource tag normalization"
```

- [ ] **Step 5: Inspect the implementation range and worktree**

Run from the repository root:

```bash
git diff --check HEAD~3..HEAD
git log -3 --oneline --stat
git status --short --branch
```

Expected: no whitespace errors; the three commits contain only the planned API, frontend, tests, and contract files; the user's existing untracked files remain untouched.
