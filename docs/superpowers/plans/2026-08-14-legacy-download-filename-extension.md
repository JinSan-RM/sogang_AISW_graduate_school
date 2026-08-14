# Legacy Download Filename Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make suffix-less legacy attachments download with the canonical extension for their validated media content type.

**Architecture:** Add a focused filename derivation helper to the existing media service and use it only when building the signed `FileResponse`. The helper preserves names that already have a suffix and conservatively leaves unsupported MIME types unchanged, so existing authorization, storage, UI, and database behavior remain intact.

**Tech Stack:** Python 3, FastAPI, Starlette `FileResponse`, SQLAlchemy 2.0, pytest

## Global Constraints

- Keep the existing attachment-click and signed-download flow.
- Do not update database rows, attachment labels, screen layout, or native/web navigation behavior.
- Preserve filenames that already have a suffix.
- Do not guess an extension for an unsupported MIME type.
- Use test-driven development and observe the focused regression test fail before production changes.

---

### Task 1: Derive the signed-download filename from the media type

**Files:**
- Modify: `backend/tests/test_media_security_and_migrations.py`
- Modify: `backend/app/media_service.py`
- Modify: `backend/app/routers/media.py`

**Interfaces:**
- Consumes: `MediaAsset.original_filename: str` and `MediaAsset.content_type: str`
- Produces: `media_download_filename(media: MediaAsset) -> str`
- Route behavior: `_serve_signed_media` passes the derived filename to `FileResponse`

- [x] **Step 1: Write a failing consumer-visible regression test**

Add a parametrized route test that inserts ready media with suffix-less legacy original filenames and hand-derived expected download names:

```python
@pytest.mark.parametrize(
    ("original_filename", "stored_filename", "content_type", "body", "expected_filename"),
    [
        ("legacy-15811068", "legacy-15811068.pdf", "application/pdf", PDF_BYTES, "legacy-15811068.pdf"),
        (
            "legacy-15811070",
            "legacy-15811070.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            b"PK\x03\x04test-docx",
            "legacy-15811070.docx",
        ),
        ("already-named.pdf", "stored.pdf", "application/pdf", PDF_BYTES, "already-named.pdf"),
        ("legacy-unknown", "stored.bin", "application/octet-stream", b"unknown", "legacy-unknown"),
    ],
)
def test_signed_download_adds_missing_extension_without_renaming_valid_files(
    api,
    media_storage,
    original_filename: str,
    stored_filename: str,
    content_type: str,
    body: bytes,
    expected_filename: str,
) -> None:
    public_directory, _ = media_storage
    public_directory.mkdir(parents=True, exist_ok=True)
    (public_directory / stored_filename).write_bytes(body)
    with api.session() as db:
        media = MediaAsset(
            owner_id=1,
            original_filename=original_filename,
            stored_filename=stored_filename,
            content_type=content_type,
            file_size=len(body),
            url=None,
            is_private=False,
            status="ready",
        )
        db.add(media)
        db.flush()
        media.url = f"/api/media/{media.id}/access-url"
        db.commit()
        media_id = media.id

    access = api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers["admin"])
    response = _signed_file_response(api, access)

    assert response.status_code == 200
    assert response.content == body
    assert response.headers["content-disposition"] == f'attachment; filename="{expected_filename}"'
```

- [x] **Step 2: Run the focused test and verify RED**

Run from `backend`:

```text
pytest tests/test_media_security_and_migrations.py::test_signed_download_adds_missing_extension_without_renaming_valid_files -q
```

Expected: two recognized suffix-less cases fail because the response filenames are still `legacy-15811068` and `legacy-15811070`; the already-suffixed and unsupported-MIME cases pass.

- [x] **Step 3: Add the minimal filename helper**

In `backend/app/media_service.py`, add:

```python
def media_download_filename(media: MediaAsset) -> str:
    filename = media.original_filename
    if Path(filename).suffix:
        return filename
    extensions = MIME_EXTENSION_PAIRS.get(normalize_content_type(media.content_type))
    if not extensions:
        return filename
    extension = min(extensions, key=lambda value: (len(value), value))
    return f"{filename}{extension}"
```

This selects `.jpg` rather than `.jpeg` for the only MIME type with multiple allowed extensions and reuses the upload-validation allowlist for all supported types.

- [x] **Step 4: Use the helper in the signed response**

Import `media_download_filename` in `backend/app/routers/media.py` and change the `FileResponse` construction to:

```python
response = FileResponse(
    path,
    media_type=media.content_type,
    filename=media_download_filename(media),
    content_disposition_type="inline" if media.content_type.startswith("image/") else "attachment",
)
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run from `backend`:

```text
pytest tests/test_media_security_and_migrations.py::test_signed_download_adds_missing_extension_without_renaming_valid_files -q
```

Expected: 4 parameter cases pass and 0 fail.

- [x] **Step 6: Run regression verification**

Run from `backend`:

```text
pytest tests/test_media_security_and_migrations.py -q
pytest -q
```

Run from the repository root:

```text
git diff --check
```

Expected: all commands exit 0 with no test failures.

Execution result: the focused regression passed 4/4, the complete media/security file passed 31/31, and `python -m compileall -q app` exited 0. The full backend run passed 245 tests and exposed one pre-existing, repeatable event-range failure in `tests/test_event_ranges.py::test_day_query_includes_multi_day_events_on_their_inclusive_end_date`; neither that test nor the event implementation is changed by this task.

- [x] **Step 7: Review and commit the implementation**

```text
git diff -- backend/tests/test_media_security_and_migrations.py backend/app/media_service.py backend/app/routers/media.py
git add backend/tests/test_media_security_and_migrations.py backend/app/media_service.py backend/app/routers/media.py docs/superpowers/plans/2026-08-14-legacy-download-filename-extension.md
git diff --cached --check
git commit -m "fix: preserve media extension in downloads"
```

Expected: only the planned backend files and this implementation plan are staged, and the commit succeeds.
