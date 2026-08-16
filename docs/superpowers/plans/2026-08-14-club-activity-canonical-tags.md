# Club Activity Canonical Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin-managed `club-promo` posts the validated source of club activity-certification tags, reflect later club renames on existing tags, and safely normalize legacy links without changing the UI.

**Architecture:** `metadata.activity_source_post_id` remains the relationship from `club-activity` posts to `club-promo` posts. The API validates and canonicalizes that relationship on writes, bulk-resolves the current source title on reads, and preserves `category` as a fallback snapshot. A dry-run-first backend command audits the seven current official clubs and backfills only unambiguous legacy records.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, pytest, React Native with Expo Router, TypeScript, Node test runner.

## Global Constraints

- Do not change screen structure, component layout, styles, copy, or interaction order.
- Do not add a `clubs` table or a new club-management screen.
- Apply source validation and canonical tag behavior only to `club-activity`; study and networking behavior stays unchanged.
- New and changed selections must reference a published, non-deleted `club-promo` post.
- An unchanged historical link may continue to reference a hidden or soft-deleted `club-promo` post and must display its last title.
- The seven current official names are cleanup acceptance data, not a runtime hardcoded selector.
- Preserve unrelated worktree files and changes.
- Baseline backend suite currently has one unrelated failure: `tests/test_event_ranges.py::test_day_query_includes_multi_day_events_on_their_inclusive_end_date`. Completion requires no additional backend failures plus all focused tests, all frontend tests, and typecheck passing.

---

### Task 1: Validate club sources and expose canonical titles

**Files:**
- Create: `backend/tests/test_club_activity_sources.py`
- Modify: `backend/app/routers/posts.py`

**Interfaces:**
- Consumes: `metadata.activity_source_post_id` as a positive decimal string on `club-activity` mutations.
- Produces: `_canonical_club_activity_source(db, board, metadata, existing_metadata=None) -> tuple[dict | None, str | None]`.
- Produces: `_club_activity_source_titles(db, board, posts) -> dict[int, str]`.
- Produces: optional `activity_source_title` on club activity list and detail responses.

- [ ] **Step 1: Write failing create and validation tests**

Create real `club-promo` and `club-activity` boards, a current dues payer, and published/hidden/deleted/wrong-board source posts. Submit activity certifications with attachment `1` and literal payloads.

```python
response = api.client.post(
    f"/api/boards/{activity_board.id}/posts",
    headers=api.headers["owner"],
    json={
        "title": "client title",
        "content": "reflection",
        "category": "client supplied club",
        "metadata": {
            "activity_date": "2026.08.14",
            "participant_dues_payer_ids": [payer.id],
            "activity_source_post_id": str(source.id),
            "bank_account": "Sogang 123",
        },
        "attachment_ids": [1],
    },
)
assert response.status_code == 200
assert stored.category == "SG_LLM"
```

Add separate assertions that a missing/non-numeric ID, wrong-board ID, hidden source, and deleted source return `422` with `code == "INVALID_ACTIVITY_SOURCE"` for a new selection.

- [ ] **Step 2: Run the focused test and verify RED**

Run in `backend`:

```powershell
python -m pytest -q tests/test_club_activity_sources.py -k "create or reject"
```

Expected: FAIL because arbitrary `category` is stored and source IDs are not validated.

- [ ] **Step 3: Implement minimal write validation and canonicalization**

Parse only positive decimal strings. For `board.slug != "club-activity"`, return metadata unchanged with no title. For a new or changed link, query a source whose board slug is `club-promo`, status is `published`, and `deleted_at IS NULL`. For an unchanged existing link, allow the same source ID without status/deletion filters as long as it still belongs to `club-promo`.

```python
def _invalid_activity_source() -> AppException:
    return AppException(
        status_code=422,
        message="Select a current club registered by an administrator.",
        code="INVALID_ACTIVITY_SOURCE",
    )


def _canonical_club_activity_source(
    db: Session,
    board: Board | None,
    metadata: dict | None,
    *,
    existing_metadata: dict | None = None,
) -> tuple[dict | None, str | None]:
    if board is None or board.slug != "club-activity":
        return metadata, None
    canonical = dict(metadata or {})
    source_id = _activity_source_post_id(canonical)
    if source_id is None:
        raise _invalid_activity_source()
    existing_source_id = _activity_source_post_id(existing_metadata)
    filters = [Post.id == source_id, Board.slug == "club-promo"]
    if source_id != existing_source_id:
        filters.extend([Post.status == "published", Post.deleted_at.is_(None)])
    title = db.scalar(select(Post.title).join(Board, Board.id == Post.board_id).where(*filters))
    if title is None:
        raise _invalid_activity_source()
    canonical["activity_source_post_id"] = str(source_id)
    return canonical, title
```

Call the helper after participant metadata canonicalization. Use its returned title instead of the client category on create/update. Do not change title generation or any other board path.

- [ ] **Step 4: Run focused tests and verify GREEN**

```powershell
python -m pytest -q tests/test_club_activity_sources.py -k "create or reject"
```

Expected: PASS.

- [ ] **Step 5: Write failing rename, deleted-history, list, and detail tests**

Create linked activity rows, rename the source, and assert both list and detail expose the renamed source title. Soft-delete the linked source and assert existing activity list/detail still expose its last title. Add a directly inserted legacy wrong-board link and assert no source title is returned.

```python
assert list_item["activity_source_title"] == "SG AI Lab"
assert detail["activity_source_title"] == "SG AI Lab"
assert wrong_board_item["activity_source_title"] is None
```

Also update an activity after its source is soft-deleted while sending the unchanged source ID; assert the update succeeds and preserves the canonical category.

- [ ] **Step 6: Run the read tests and verify RED**

```powershell
python -m pytest -q tests/test_club_activity_sources.py -k "title or historical"
```

Expected: FAIL because response items do not include `activity_source_title` and deleted historical sources are not resolved.

- [ ] **Step 7: Implement bulk list and single-detail resolution**

Collect source IDs from the fetched page and issue one source query joined to `Board.slug == "club-promo"`. Do not filter source status or `deleted_at` for read resolution so historical links retain the last official name. Reject wrong-board IDs by the join condition.

```python
source_titles = _club_activity_source_titles(db, board, [row[0] for row in rows])
"activity_source_title": source_titles.get(_activity_source_post_id(post.metadata_json)),
```

Use the same resolver for detail with one post. Do not add per-row source queries.

- [ ] **Step 8: Run backend activity tests and commit the backend slice**

```powershell
python -m pytest -q tests/test_club_activity_sources.py tests/test_activity_certification_edit.py tests/test_activity_certification_dues_payers.py
git add -- backend/app/routers/posts.py backend/tests/test_club_activity_sources.py
git diff --cached --check
git commit -m "feat(api): canonicalize club activity sources"
```

Expected: all focused tests pass and the commit contains only backend source behavior and tests.

### Task 2: Use canonical names without changing the UI

**Files:**
- Modify: `frontend/tests/activityCertification.test.ts`
- Modify: `frontend/utils/activityCertification.ts`
- Modify: `frontend/types/index.ts`
- Modify: `frontend/app/board/[boardId].tsx`
- Modify: `frontend/app/board/post/[postId].tsx`
- Modify: `frontend/app/board/post/create.tsx`

**Interfaces:**
- Consumes: `PostListItem.activity_source_title` and `PostDetail.activity_source_title`.
- Produces: `activityCertificationBadgeLabel(post, boardSlug) -> string`.
- Produces: `activitySourcePostFilters() -> { sort: "latest"; status: "published" }`.

- [ ] **Step 1: Write failing label and source-filter tests**

Add literal expectations for a renamed source, category fallback, legacy fallback, generic fallback, unchanged study behavior, and published-only source requests.

```typescript
assert.equal(
  activityCertificationBadgeLabel(
    { activity_source_title: "서강의 봄", category: "예전 이름" },
    "club-activity",
  ),
  "서강의 봄",
);
assert.equal(
  activityCertificationBadgeLabel(
    { category: "동아리 활동 인증", metadata: { legacy_activity_name: "서뽈링" } },
    "club-activity",
  ),
  "서뽈링",
);
assert.deepEqual(activitySourcePostFilters(), { sort: "latest", status: "published" });
```

- [ ] **Step 2: Run the frontend focused test and verify RED**

Run in `frontend`:

```powershell
npx tsx --test tests/activityCertification.test.ts
```

Expected: FAIL because the two exported resolver functions do not exist.

- [ ] **Step 3: Implement the pure resolvers and response fields**

Add `activity_source_title?: string | null` to both post response types. Treat `동아리 활동 인증`, `활동 인증`, and `안내` as generic only for `club-activity` fallback selection.

```typescript
type ActivityBadgePost = {
  activity_source_title?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function activityCertificationBadgeLabel(post: ActivityBadgePost, boardSlug?: string): string {
  if (boardSlug !== "club-activity") return specificText(post.category) ?? "활동 인증";
  return specificText(post.activity_source_title)
    ?? specificNonGenericText(post.category)
    ?? specificNonGenericText(post.metadata?.legacy_activity_name)
    ?? "동아리 활동 인증";
}

export function activitySourcePostFilters() {
  return { sort: "latest" as const, status: "published" };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

```powershell
npx tsx --test tests/activityCertification.test.ts
```

Expected: PASS.

- [ ] **Step 5: Wire the existing screens to the pure functions**

Keep the selection sheet, pill elements, styles, and copy unchanged. Pass the board slug into the existing activity tile and replace only the inline label expression. Use the same resolver for the detail label. Use `activitySourcePostFilters()` in the existing source-post query so admins also see only published options.

```tsx
<Text style={styles.activityPillText}>
  {activityCertificationBadgeLabel(post, boardSlug)}
</Text>
```

- [ ] **Step 6: Run frontend regression checks and commit the frontend slice**

```powershell
npm test
npm run typecheck
git add -- frontend/tests/activityCertification.test.ts frontend/utils/activityCertification.ts frontend/types/index.ts frontend/app/board/[boardId].tsx frontend/app/board/post/[postId].tsx frontend/app/board/post/create.tsx
git diff --cached --check
git commit -m "feat(frontend): resolve canonical club activity tags"
```

Expected: all 162 baseline tests plus new tests pass, typecheck exits `0`, and rendered component structure/styles are unchanged.

### Task 3: Add safe legacy cleanup tooling

**Files:**
- Create: `backend/app/club_activity_cleanup.py`
- Create: `backend/scripts/normalize_club_activity_sources.py`
- Create: `backend/tests/test_club_activity_cleanup.py`

**Interfaces:**
- Produces: `normalize_club_name(value: str) -> str` using NFKC, trim, and internal whitespace collapse.
- Produces: `build_club_activity_cleanup_plan(db, aliases) -> ClubActivityCleanupPlan` without mutating rows.
- Produces: `apply_club_activity_cleanup_plan(db, plan) -> int` with mutations committed only by the CLI.
- CLI: `python scripts/normalize_club_activity_sources.py [--aliases path.json] [--apply]`.

- [ ] **Step 1: Write failing unit/integration tests for planning**

Use real SQLAlchemy rows. Verify NFKC/whitespace normalization, valid existing links, exact-name backfill, reviewed alias backfill, ambiguous/unmatched reporting, and published official-set blocking.

```python
plan = build_club_activity_cleanup_plan(
    db,
    aliases={"예전 AI 동아리": "SG_LLM"},
    expected_current_names=CURRENT_CLUB_NAMES,
)
assert plan.source_issues == []
assert [(change.post_id, change.source_post_id, change.category) for change in plan.changes] == [
    (activity.id, source.id, "SG_LLM"),
]
assert plan.unmatched[0].post_id == unmatched.id
```

Assert building a plan does not alter persisted rows. Assert a missing official club or extra published club creates a source issue and makes apply refuse.

- [ ] **Step 2: Run cleanup tests and verify RED**

```powershell
python -m pytest -q tests/test_club_activity_cleanup.py
```

Expected: FAIL because the cleanup module does not exist.

- [ ] **Step 3: Implement deterministic planning and apply functions**

Define immutable result dataclasses for changes, unmatched records, and source issues. Resolve already-linked sources from all `club-promo` rows including soft-deleted rows. Resolve new links only against the unique published current sources. Validate alias targets against the current source map. Do not guess when zero or multiple candidates remain.

```python
@dataclass(frozen=True)
class ClubActivityChange:
    post_id: int
    source_post_id: int
    category: str


@dataclass(frozen=True)
class ClubActivityUnmatched:
    post_id: int
    name: str | None
    reason: str


@dataclass(frozen=True)
class ClubActivityCleanupPlan:
    changes: tuple[ClubActivityChange, ...]
    unchanged_count: int
    unmatched: tuple[ClubActivityUnmatched, ...]
    source_issues: tuple[str, ...]


CURRENT_CLUB_NAMES = (
    "SG_LLM",
    "알바트로스냅",
    "서강의 봄",
    "서뽈링",
    "서강와인",
    "인간지능투자",
    "FC리턴윈",
)
```

`apply_club_activity_cleanup_plan` raises `ValueError` when `source_issues` is non-empty; otherwise it sets canonical string `activity_source_post_id` and the category snapshot only for planned changes.

- [ ] **Step 4: Implement the dry-run-first CLI**

Load an optional UTF-8 JSON object whose keys are aliases and values are exact official titles. Print mode, current source audit, change/unchanged/unmatched counts, and every unresolved post ID/reason. On `--apply`, apply in one session transaction and commit once; on any error roll back and exit nonzero. Without `--apply`, do not mutate or commit.

- [ ] **Step 5: Run cleanup tests and verify GREEN**

```powershell
python -m pytest -q tests/test_club_activity_cleanup.py
```

Expected: PASS.

- [ ] **Step 6: Commit cleanup tooling**

```powershell
git add -- backend/app/club_activity_cleanup.py backend/scripts/normalize_club_activity_sources.py backend/tests/test_club_activity_cleanup.py
git diff --cached --check
git commit -m "feat(ops): normalize club activity sources"
```

### Task 4: Align contracts and verify the complete change

**Files:**
- Modify: `docs/phase2/API_CONTRACT.md`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`
- Add: `docs/superpowers/plans/2026-08-14-club-activity-canonical-tags.md`

**Interfaces:**
- Documents: `422 INVALID_ACTIVITY_SOURCE`, server-canonical category, `activity_source_title`, published-only selection, historical last-title behavior, and dry-run cleanup command.

- [ ] **Step 1: Update contract and backlog documentation**

Record that `club-activity` requires a valid admin-managed source for new/changed links, returns current source titles on list/detail, permits unchanged inactive historical links, and uses the cleanup command for legacy data. Explicitly state that screen layout and study/networking behavior are unchanged.

- [ ] **Step 2: Run focused verification**

```powershell
Set-Location backend
python -m pytest -q tests/test_club_activity_sources.py tests/test_club_activity_cleanup.py tests/test_activity_certification_edit.py tests/test_activity_certification_dues_payers.py
Set-Location ../frontend
npx tsx --test tests/activityCertification.test.ts
npm run typecheck
```

Expected: zero focused failures.

- [ ] **Step 3: Run full regression verification**

```powershell
Set-Location backend
python -m pytest -q
Set-Location ../frontend
npm test
npm run typecheck
npm run lint
```

Expected: frontend commands exit `0`; backend has no new failures beyond the documented baseline event-range failure. If the backend failure set changes, stop and investigate before committing.

- [ ] **Step 4: Review scope and commit documentation/plan**

```powershell
git diff --check
git status --short
git diff --stat HEAD~3
git add -- docs/phase2/API_CONTRACT.md docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md docs/superpowers/plans/2026-08-14-club-activity-canonical-tags.md
git diff --cached --check
git commit -m "docs: document canonical club activity tags"
```

Expected: only the planned feature, tests, cleanup tooling, and docs are committed; no UI style/layout changes or unrelated files are present.
