# HEIC display compatibility implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Existing and new HEIC images display as JPEG while originals are preserved.
**Architecture:** Protected, representation-scoped signed preview endpoint with
atomic versioned sidecars, eager generation for uploads and lazy legacy coverage.
**Tech Stack:** FastAPI, Pillow 13.0.0, pillow-heif 1.8.1; existing SQLAlchemy models.
**Spec:** `docs/superpowers/specs/2026-10-28-heic-display-design.md`

## Global constraints

- WP5/WP9 P0; preserve originals, IDs, metadata, existing permissions and file URLs.
- JPEG quality 88, maximum edge 2048, RGB output, applied orientation, no EXIF.
- Sidecars share original storage privacy; no DB migration or native release.

## Review focus

- A preview signature cannot retrieve original bytes or another media object.
- Corrupt input cannot overwrite originals or publish incomplete JPEGs.
- Simultaneous legacy reads see complete, reusable previews.
- Private previews obey the same authorization/cache/deletion rules as originals.
- Existing installed clients receive viewable JPEGs without frontend API changes.

### Task 1: Protected JPEG display copies

Files: create `backend/app/media_previews.py` and
`backend/tests/test_media_previews.py`; modify `backend/app/media_service.py`,
`backend/app/routers/media.py`, `backend/app/account_deletion.py`,
`backend/requirements.txt`, and existing HEIC upload regression fixtures.

Interface: `preview_path(source: Path) -> Path`,
`ensure_jpeg_preview(source: Path) -> Path`, and
`create_media_access_url(media, *, original=False, now=None) -> tuple[str, int]`.

- [x] Write API regressions using real encoded HEIC: default access downloads
  JPEG, explicit original access downloads identical HEIC, existing rows lazily
  generate, invalid/expired/substituted signatures do not generate files.
- [x] Run tests and observe failures caused by missing JPEG behavior.
- [x] Implement conversion, signed preview delivery and sidecar lifecycle;
  add cache/concurrency, size/orientation and deletion rollback regressions.
- [x] Run focused tests and the backend suite; commit this vertical slice.

### Task 2: Verify affected originals and document operation

Files: update `PLAN.md`, `CODEX.md`, `docs/phase2/API_CONTRACT.md`,
`docs/phase2/AUTH_PERMISSION_SPEC.md`, `docs/phase2/DB_SCHEMA_DECISIONS.md`,
`OPERATIONS.md`, and `docs/qa/HEIC_DISPLAY_2026-10-28.md`.

- [x] Convert private local copies of media 1159/1160/1161, compare original
  hashes, and verify the generated JPEGs decode in Chromium.
- [x] Run compile/import, dependency audit, frontend typecheck and a Docker
  smoke test if available; report exact blockers without claiming a pass.
- [x] Review the complete diff, resolve material findings, update validation
  notes, and retain the candidate for operational deployment.
