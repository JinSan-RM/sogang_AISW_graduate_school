# Legacy Media Null Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the production legacy import to run in a fresh review database without creating or requiring an administrator account.

**Architecture:** Keep post media owned by the imported post author and use the existing nullable `MediaAsset.owner_id` contract for special-content media that has no real author. Preserve all existing relationship-based media authorization and the one-time importer's fixed count, hash, and empty-production guards.

**Tech Stack:** Python 3.12, SQLAlchemy 2.0, FastAPI, pytest, PostgreSQL 16, Docker Compose, Bash

## Global Constraints

- Production startup and migration must not create a synthetic user or grant an imported member administrator privileges.
- Approved totals remain 685 posts, 247 comments, 196 inactive legacy users, no administrator, no authorless post/comment, 25 ownerless special-content media assets, 1,923 ledger records, 637 supported files, 11 archived unsupported files, and 706,706,761 verified media bytes.
- Post media keeps the imported post author's ID; special-content media without a real author uses `owner_id=NULL`.
- FAQ and board-metadata media remain relationship-authorized; private mutual-aid media remains administrator-only.
- No schema migration or dependency change is permitted.
- Failed review artifacts remain preserved until the successful replacement import has passed browser and device QA.

---

### Task 1: Reproduce and fix the administrator-free attachment import

**Files:**
- Modify: `backend/tests/test_legacy_import.py:309-515`
- Modify: `backend/app/legacy_import.py:1478-1486,1639-1650`

**Interfaces:**
- Consumes: `import_attachments(db: Session, rows: list[SourceRow], reference_urls: dict[str, str], posts_by_source_id: dict[str, Post], *, ...) -> Counter`
- Produces: `MediaAsset.owner_id` equal to the linked post author ID or `None` when no post author exists.

- [ ] **Step 1: Make the existing tests model a production review database with no administrator**

Add `User` to the model imports:

```python
from app.models.user import User
```

At the start of each database block in these three tests, demote the fixture administrator and flush before calling `import_attachments()`:

- `test_local_attachment_import_links_one_copy_per_post_and_serves_it`
- `test_local_faq_image_is_returned_and_authorized`
- `test_unsupported_legacy_download_is_archived_without_exposing_media`

```python
admin = db.scalar(select(User).where(User.role == "admin"))
assert admin is not None
admin.role = "user"
db.flush()
```

Add hand-derived ownership assertions:

```python
assert all(media.owner_id == post.author_id for media in imported_media)
```

For the FAQ case, query its created media row before leaving the session and assert after the import:

```python
imported_media = db.scalar(
    select(MediaAsset).where(MediaAsset.stored_filename == "legacy-4322320.png")
)
assert imported_media is not None
assert imported_media.owner_id is None
```

The unsupported-file test already proves no media row is created and the archived ledger reason is retained.

- [ ] **Step 2: Run focused tests and verify the production bug is reproduced**

Run from `backend/`:

```bash
python -m pytest \
  tests/test_legacy_import.py::test_local_attachment_import_links_one_copy_per_post_and_serves_it \
  tests/test_legacy_import.py::test_local_faq_image_is_returned_and_authorized \
  tests/test_legacy_import.py::test_unsupported_legacy_download_is_archived_without_exposing_media \
  -q
```

Expected: all selected tests fail at the current unconditional check with `RuntimeError: A review-database administrator is required for archived media ownership.`

- [ ] **Step 3: Implement the minimal nullable-owner behavior**

Delete the unconditional administrator query and failure:

```python
admin = db.scalar(select(User).where(User.role == "admin").order_by(User.id))
if apply and admin is None:
    raise RuntimeError("A review-database administrator is required for archived media ownership.")
```

Change only new media construction:

```python
media = MediaAsset(
    owner_id=post.author_id if post else None,
    original_filename=filename,
    stored_filename=stored_filename,
    content_type=content_type,
    file_size=file_size,
    url=None,
    is_private=is_private,
    status="ready",
    created_at=parse_datetime(row.data.get("regiDatetime")) or utc_now(),
)
```

- [ ] **Step 4: Run the focused tests and verify they pass**

Run the same three-test command from Step 2.

Expected: `3 passed` with exit code 0. The ownership assertions prove that both branches are exercised, and the FAQ HTTP assertions prove relationship-based authorization remains effective.

- [ ] **Step 5: Review the diff for scope and formatting**

```bash
git diff --check
git diff -- backend/app/legacy_import.py backend/tests/test_legacy_import.py
```

Expected: only the administrator-free regression setup, ownership assertions, unconditional check removal, and nullable special-media assignment appear.

### Task 2: Verify the repository and publish the fix

**Files:**
- Verify: `backend/tests/test_legacy_import.py`
- Verify: `backend/tests/test_ip_production_deployment.py`
- Verify: all `backend/tests/`
- Commit: `backend/app/legacy_import.py`, `backend/tests/test_legacy_import.py`

**Interfaces:**
- Consumes: the Task 1 behavior.
- Produces: a tested commit on `codex/gcp-ip-production` that the GCP VM can fast-forward to.

- [ ] **Step 1: Run the complete legacy-import and deployment regression groups**

From `backend/`:

```bash
python -m pytest tests/test_legacy_import.py tests/test_ip_production_deployment.py -q
```

Expected: exit code 0 and no failures.

- [ ] **Step 2: Run the complete backend suite**

From `backend/`:

```bash
python -m pytest -q
```

Expected: exit code 0 and no failures.

- [ ] **Step 3: Commit the tested implementation**

```bash
git add backend/app/legacy_import.py backend/tests/test_legacy_import.py
git diff --cached --check
git commit -m "fix: import legacy media without seeded admin"
```

- [ ] **Step 4: Verify branch state and push**

```bash
git status --short --branch
git log -2 --oneline
git push origin codex/gcp-ip-production
```

Expected: clean tracked worktree and a successful update of `origin/codex/gcp-ip-production` containing the design, plan, tests, and fix commits.

### Task 3: Fast-forward the VM and rerun the guarded import

**Files:**
- Preserve: `/srv/aisw-import/incoming/migration-output-*`
- Preserve: `/srv/aisw-import/incoming/source-sha256.txt`
- Create: `$HOME/aisw-production-import-<UTC timestamp>.log`

**Interfaces:**
- Consumes: the pushed `codex/gcp-ip-production` branch and the approved source manifest SHA-256.
- Produces: a verified production PostgreSQL database and Docker media volumes, plus a coordinated backup set and deployment-ready manifest.

- [ ] **Step 1: Confirm the VM branch is clean and fast-forward it**

```bash
cd /opt/aisw-app
git status --short --branch
git pull --ff-only origin codex/gcp-ip-production
git log -3 --oneline
```

Expected: no tracked local changes and HEAD at the pushed fix commit.

- [ ] **Step 2: Confirm production targets remain untouched**

Use the same three-file Compose model as the importer:

```bash
docker compose --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.production.example.yml \
  -f docker-compose.ip.yml \
  exec -T db sh -ceu '
    psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
      --tuples-only --no-align \
      --command "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = current_schema()"
  '
```

Expected: `0`. Do not delete the failed timestamped review database or output directory.

- [ ] **Step 3: Run a new one-time import in the foreground**

```bash
(
  set -Eeuo pipefail
  umask 077
  cd /opt/aisw-app
  log="$HOME/aisw-production-import-$(date -u +%Y%m%dT%H%M%SZ).log"
  bash scripts/production-import-legacy.sh \
    /srv/aisw-import/incoming \
    91918ee5a1596985f3a33fe2f7a55a1a9515d80f06a903141243b3a42af8cda0 \
    2>&1 | tee "$log"
  printf '\nIMPORT LOG: %s\n' "$log"
)
```

Expected final output includes `Legacy import and production restore passed.`, the new review database, a 64-character media manifest, and the new coordinated backup directory. Any failure after production restore begins is a stop condition; do not rerun or delete volumes.

- [ ] **Step 4: Preserve success evidence before TLS startup**

Record the exact values printed for:

```text
Review database
Media manifest
Output and coordinated backup set
```

Do not delete raw sources, the failed review artifacts, or successful artifacts until PC web, Android, and iOS checks pass.
