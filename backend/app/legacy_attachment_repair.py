from __future__ import annotations

from collections import Counter
from contextlib import contextmanager
import hashlib
import mimetypes
import os
from pathlib import Path
import re
import shutil
from tempfile import TemporaryDirectory
from typing import Iterator, Sequence
import urllib.parse

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.legacy_import import (
    MIME_EXTENSIONS,
    SourceRow,
    _detected_content_type,
    _legacy_attachment_filename,
    index_local_attachment_files,
    load_article_workbook,
    load_reference_attachment_urls,
    value_as_int,
    value_as_text,
)
from app.media_service import media_access_reference
from app.models.media import MediaAsset, PostAttachment
from app.models.post import Post


REPAIRABLE_LEGACY_EXTENSIONS = frozenset({".doc", ".hwp", ".zip", ".txt", ".ipynb"})
REPAIR_CONTENT_TYPES_BY_SOURCE_EXTENSION = {
    ".doc": frozenset(
        {"application/x-hwp", "application/haansofthwp", "application/vnd.hancom.hwp"}
    ),
    ".hwp": frozenset(
        {"application/x-hwp", "application/haansofthwp", "application/vnd.hancom.hwp"}
    ),
    ".zip": frozenset({"application/zip"}),
    ".txt": frozenset({"text/plain"}),
    ".ipynb": frozenset({"application/x-ipynb+json", "application/json"}),
}
QA_175_176_REPAIR_SET = "qa-175-176"
QA_175_EXISTING_HWP_STORAGE_ID = "10946091"
QA_175_176_EXPECTED_ARTICLE_IDS = {
    "10946091": "6471114",
    "12621604": "6912953",
    "12621345": "6892628",
    "12358989": "6829594",
    "10946120": "6471121",
    "12359030": "6829611",
    "12359031": "6829611",
    "12358946": "6829569",
}
STORAGE_ID_RE = re.compile(r"[A-Za-z0-9_-]+")


def _normalized_storage_ids(storage_ids: Sequence[str]) -> tuple[str, ...]:
    normalized = tuple(dict.fromkeys(value.strip() for value in storage_ids if value.strip()))
    if not normalized:
        raise ValueError("At least one explicit legacy storage ID is required.")
    invalid = [value for value in normalized if STORAGE_ID_RE.fullmatch(value) is None]
    if invalid:
        raise ValueError("Invalid legacy storage IDs: " + ", ".join(invalid))
    return normalized


def _selected_rows(
    attachments: list[SourceRow],
    local_files: dict[str, Path],
    storage_ids: tuple[str, ...],
) -> list[SourceRow]:
    rows_by_storage_id: dict[str, list[SourceRow]] = {}
    for row in attachments:
        storage_id = value_as_text(row.data.get("fileStorageId"))
        if storage_id in storage_ids:
            rows_by_storage_id.setdefault(storage_id, []).append(row)

    missing_rows = [value for value in storage_ids if value not in rows_by_storage_id]
    duplicate_rows = [value for value in storage_ids if len(rows_by_storage_id.get(value, ())) > 1]
    missing_files = [value for value in storage_ids if value not in local_files]
    unsupported = [
        value
        for value in storage_ids
        if value in local_files and local_files[value].suffix.lower() not in REPAIRABLE_LEGACY_EXTENSIONS
    ]
    errors = []
    if missing_rows:
        errors.append("missing workbook rows: " + ", ".join(missing_rows))
    if duplicate_rows:
        errors.append("duplicate workbook rows: " + ", ".join(duplicate_rows))
    if missing_files:
        errors.append("missing local files: " + ", ".join(missing_files))
    if unsupported:
        errors.append("unsupported repair extensions: " + ", ".join(unsupported))
    if errors:
        raise ValueError("; ".join(errors))
    return [rows_by_storage_id[value][0] for value in storage_ids]


def _posts_by_source_id(
    db: Session,
    rows: list[SourceRow],
    *,
    lock: bool,
) -> dict[str, Post]:
    required_article_ids = {value_as_text(row.data.get("writeId")) for row in rows}
    matching_posts: dict[str, list[Post]] = {}
    statement = select(Post).where(Post.status == "published", Post.deleted_at.is_(None))
    if lock:
        statement = statement.with_for_update()
    for post in db.scalars(statement).all():
        metadata = post.metadata_json or {}
        source_id = metadata.get("legacy_write_id") or metadata.get("legacy_article_id")
        normalized_source_id = "" if source_id is None else str(source_id)
        if normalized_source_id in required_article_ids:
            matching_posts.setdefault(normalized_source_id, []).append(post)
    duplicates = sorted(
        source_id for source_id, candidates in matching_posts.items() if len(candidates) > 1
    )
    if duplicates:
        raise ValueError("Multiple published legacy parent posts: " + ", ".join(duplicates))
    posts = {source_id: candidates[0] for source_id, candidates in matching_posts.items()}
    missing = sorted(required_article_ids - posts.keys())
    if missing:
        raise ValueError("Published legacy parent posts were not found: " + ", ".join(missing))
    return posts


def _lock_repair_tables(db: Session) -> None:
    if db.get_bind().dialect.name != "postgresql":
        return
    db.execute(
        text(
            "LOCK TABLE posts, media_assets, post_attachments, legacy_import_records "
            "IN SHARE ROW EXCLUSIVE MODE"
        )
    )


def _validate_expected_article_ids(
    rows: list[SourceRow],
    storage_ids: tuple[str, ...],
    expected_article_ids: dict[str, str] | None,
) -> None:
    if expected_article_ids is None:
        return
    if set(storage_ids) != set(expected_article_ids):
        raise ValueError("Selected storage IDs do not exactly match the named repair set.")
    actual_article_ids = {
        value_as_text(row.data.get("fileStorageId")): value_as_text(row.data.get("writeId"))
        for row in rows
    }
    mismatches = [
        storage_id
        for storage_id in storage_ids
        if actual_article_ids.get(storage_id) != expected_article_ids[storage_id]
    ]
    if mismatches:
        raise ValueError(
            "Legacy attachment parent mapping changed for storage IDs: " + ", ".join(mismatches)
        )


def _preflight_files(
    local_files: dict[str, Path],
    rows: list[SourceRow],
    posts: dict[str, Post],
    storage_ids: tuple[str, ...],
    maximum_bytes: int,
    reference_urls: dict[str, str],
) -> list[dict[str, object]]:
    rows_by_storage_id = {
        value_as_text(row.data.get("fileStorageId")): row
        for row in rows
    }
    planned_files: list[dict[str, object]] = []
    invalid: list[str] = []
    oversized: list[str] = []
    for storage_id in storage_ids:
        source = local_files[storage_id]
        source_extension = source.suffix.lower()
        source_size = source.stat().st_size
        content_type = _detected_content_type(
            source,
            mimetypes.guess_type(source.name)[0] or "",
        )
        allowed_content_types = REPAIR_CONTENT_TYPES_BY_SOURCE_EXTENSION[source_extension]
        if source_size <= 0 or content_type not in allowed_content_types:
            invalid.append(storage_id)
            continue
        if source_size > maximum_bytes:
            oversized.append(storage_id)
            continue
        row = rows_by_storage_id[storage_id]
        article_id = value_as_text(row.data.get("writeId"))
        post = posts[article_id]
        workbook_url = value_as_text(row.data.get("link_url"))
        reference_url = reference_urls.get(storage_id, "")
        effective_url = workbook_url or reference_url
        planned_files.append(
            {
                "storage_id": storage_id,
                "source_filename": source.name,
                "source_size": source_size,
                "source_sha256": _sha256_file(source),
                "detected_content_type": content_type,
                "target_extension": MIME_EXTENSIONS[content_type],
                "legacy_article_id": article_id,
                "post_id": post.id,
                "post_title": post.title,
                "post_status": post.status,
                "workbook_row_sha256": row.source_hash,
                "workbook_subject": value_as_text(row.data.get("subject")),
                "workbook_sequence": value_as_int(row.data.get("sequence")),
                "workbook_link_url_sha256": _sha256_text(workbook_url),
                "reference_url_sha256": _sha256_text(reference_url),
                "expected_is_private": "/private/" in effective_url.lower(),
            }
        )
    if invalid:
        raise ValueError("unsupported or invalid local files: " + ", ".join(invalid))
    if oversized:
        raise ValueError(
            f"local files exceed {maximum_bytes} bytes: " + ", ".join(oversized)
        )
    return planned_files


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _preflight_identity(planned_files: list[dict[str, object]]) -> list[dict[str, object]]:
    keys = (
        "storage_id",
        "source_filename",
        "source_size",
        "source_sha256",
        "detected_content_type",
        "target_extension",
        "legacy_article_id",
        "post_id",
        "post_status",
        "workbook_row_sha256",
        "workbook_subject",
        "workbook_sequence",
        "workbook_link_url_sha256",
        "reference_url_sha256",
        "expected_original_filename",
        "expected_is_private",
    )
    return [{key: planned[key] for key in keys} for planned in planned_files]


def _validate_applied_results(
    db: Session,
    planned_files: list[dict[str, object]],
    *,
    public_media_dir: Path,
    private_media_dir: Path,
) -> list[Path]:
    all_media = db.scalars(select(MediaAsset)).all()
    errors: list[str] = []
    verified_paths: list[Path] = []
    for planned in planned_files:
        storage_id = str(planned["storage_id"])
        candidates = [
            media
            for media in all_media
            if re.fullmatch(
                rf"legacy-{re.escape(storage_id)}(?:\.[^.]*)?",
                media.stored_filename,
            )
        ]
        if len(candidates) != 1:
            errors.append(f"{storage_id}: expected one media row, found {len(candidates)}")
            continue
        media = candidates[0]
        expected_extension = str(planned["target_extension"])
        expected_content_type = str(planned["detected_content_type"])
        expected_post_id = int(planned["post_id"])
        link = db.scalar(
            select(PostAttachment).where(
                PostAttachment.post_id == expected_post_id,
                PostAttachment.media_id == media.id,
            )
        )
        root = private_media_dir if media.is_private else public_media_dir
        target = root.expanduser().resolve() / media.stored_filename
        valid = (
            Path(media.stored_filename).name == media.stored_filename
            and Path(media.stored_filename).suffix.lower() == expected_extension
            and media.original_filename == planned["expected_original_filename"]
            and media.content_type == expected_content_type
            and media.status == "ready"
            and media.is_private is bool(planned["expected_is_private"])
            and link is not None
            and link.sort_order == int(planned["workbook_sequence"])
            and target.is_file()
            and not target.is_symlink()
            and target.stat().st_size == int(planned["source_size"])
            and media.file_size == int(planned["source_size"])
            and _sha256_file(target) == planned["source_sha256"]
        )
        if not valid:
            errors.append(f"{storage_id}: applied media does not match the preflight source")
            continue
        verified_paths.append(target)
    if errors:
        raise RuntimeError("Legacy attachment repair postcondition failed: " + "; ".join(errors))
    return verified_paths


def _rows_with_fallback_filenames(
    rows: list[SourceRow],
    local_files: dict[str, Path],
    reference_urls: dict[str, str],
    planned_files: list[dict[str, object]],
) -> list[SourceRow]:
    target_extensions = {
        str(planned["storage_id"]): str(planned["target_extension"])
        for planned in planned_files
    }
    planned_by_storage_id = {
        str(planned["storage_id"]): planned
        for planned in planned_files
    }
    prepared = []
    for row in rows:
        storage_id = value_as_text(row.data.get("fileStorageId"))
        target_extension = target_extensions[storage_id]
        subject = value_as_text(row.data.get("subject"))
        if Path(subject).suffix.lower() == target_extension:
            corrected_name = subject
        else:
            reference_name = Path(
                urllib.parse.unquote(
                    urllib.parse.urlparse(reference_urls.get(storage_id, "")).path
                )
            ).name
            corrected_name = (
                reference_name
                if Path(reference_name).suffix.lower() == target_extension
                else f"{local_files[storage_id].stem}{target_extension}"
            )
        planned_by_storage_id[storage_id]["expected_original_filename"] = (
            _legacy_attachment_filename(corrected_name, storage_id, reference_urls.get(storage_id, ""))
        )
        if corrected_name == subject:
            prepared.append(row)
            continue
        prepared.append(
            SourceRow(
                row.source_file,
                row.sheet,
                row.row_number,
                {**row.data, "subject": corrected_name},
            )
        )
    return prepared


def _normalize_file_ownership(paths: list[Path], roots: tuple[Path, Path]) -> None:
    if os.name == "nt" or not hasattr(os, "geteuid") or os.geteuid() != 0:
        return
    resolved_roots = tuple(root.expanduser().resolve() for root in roots)
    for path in paths:
        root = next(candidate for candidate in resolved_roots if path.parent == candidate)
        root_stat = root.stat()
        if path.is_symlink():
            raise RuntimeError(f"Refusing symlinked selected media file: {path.name}")
        os.chown(path, root_stat.st_uid, root_stat.st_gid, follow_symlinks=False)


def _matching_media_files(root: Path, storage_ids: tuple[str, ...]) -> list[Path]:
    if not root.exists():
        return []
    prefixes = tuple(f"legacy-{value}." for value in storage_ids)
    exact_names = {f"legacy-{value}" for value in storage_ids}
    return [
        path
        for path in root.iterdir()
        if (path.is_file() or path.is_symlink())
        and (path.name in exact_names or path.name.startswith(prefixes))
    ]


def _media_candidates_for_storage_id(
    all_media: list[MediaAsset],
    storage_id: str,
) -> list[MediaAsset]:
    return [
        media
        for media in all_media
        if re.fullmatch(
            rf"legacy-{re.escape(storage_id)}(?:\.[^.]*)?",
            media.stored_filename,
        )
    ]


def _validate_preserved_existing_attachments(
    db: Session,
    planned_files: list[dict[str, object]],
    *,
    public_media_dir: Path,
    private_media_dir: Path,
) -> list[str]:
    all_media = db.scalars(select(MediaAsset)).all()
    errors: list[str] = []
    validated: list[str] = []
    for planned in planned_files:
        storage_id = str(planned["storage_id"])
        candidates = _media_candidates_for_storage_id(all_media, storage_id)
        if len(candidates) != 1:
            errors.append(f"{storage_id}: expected one existing media row, found {len(candidates)}")
            continue
        media = candidates[0]
        expected_post_id = int(planned["post_id"])
        link = db.scalar(
            select(PostAttachment).where(
                PostAttachment.post_id == expected_post_id,
                PostAttachment.media_id == media.id,
            )
        )
        root = private_media_dir if media.is_private else public_media_dir
        target = root.expanduser().resolve() / media.stored_filename
        detected_content_type = (
            _detected_content_type(target, media.content_type)
            if target.is_file() and not target.is_symlink()
            else ""
        )
        valid = (
            Path(media.stored_filename).name == media.stored_filename
            and media.status == "ready"
            and media.is_private is bool(planned["expected_is_private"])
            and link is not None
            and target.is_file()
            and not target.is_symlink()
            and target.stat().st_size == int(planned["source_size"])
            and media.file_size == int(planned["source_size"])
            and _sha256_file(target) == planned["source_sha256"]
            and detected_content_type == planned["detected_content_type"]
        )
        if not valid:
            errors.append(f"{storage_id}: existing media does not match the preflight source")
            continue
        validated.append(storage_id)
    if errors:
        raise RuntimeError("Legacy attachment repair postcondition failed: " + "; ".join(errors))
    return validated


def _reject_existing_insert_targets(
    db: Session,
    storage_ids: tuple[str, ...],
    *,
    public_media_dir: Path,
    private_media_dir: Path,
) -> None:
    all_media = db.scalars(select(MediaAsset)).all()
    existing = []
    for storage_id in storage_ids:
        media_exists = bool(_media_candidates_for_storage_id(all_media, storage_id))
        matching_files = [
            path
            for root in (public_media_dir, private_media_dir)
            for path in _matching_media_files(root.expanduser().resolve(), (storage_id,))
        ]
        symlink = next((path for path in matching_files if path.is_symlink()), None)
        if symlink is not None:
            raise ValueError(f"symlinked selected media file is not allowed: {symlink.name}")
        file_exists = bool(matching_files)
        if media_exists or file_exists:
            existing.append(storage_id)
    if existing:
        raise ValueError("insert-only repair targets already exist: " + ", ".join(existing))


def _insert_missing_attachments(
    db: Session,
    planned_files: list[dict[str, object]],
    *,
    local_files: dict[str, Path],
    public_media_dir: Path,
    private_media_dir: Path,
) -> Counter:
    stats: Counter = Counter()
    for planned in planned_files:
        storage_id = str(planned["storage_id"])
        source = local_files[storage_id]
        stored_filename = f"legacy-{storage_id}{planned['target_extension']}"
        root = private_media_dir if bool(planned["expected_is_private"]) else public_media_dir
        destination = root.expanduser().resolve() / stored_filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        with source.open("rb") as source_handle, destination.open("xb") as destination_handle:
            shutil.copyfileobj(source_handle, destination_handle, length=1024 * 1024)
        if (
            destination.stat().st_size != int(planned["source_size"])
            or _sha256_file(destination) != planned["source_sha256"]
        ):
            raise RuntimeError(f"Copied legacy attachment differs from preflight source: {storage_id}")

        post = db.get(Post, int(planned["post_id"]))
        if post is None:
            raise RuntimeError(f"Legacy attachment repair parent disappeared: {storage_id}")
        media = MediaAsset(
            owner_id=post.author_id,
            original_filename=str(planned["expected_original_filename"]),
            stored_filename=stored_filename,
            content_type=str(planned["detected_content_type"]),
            file_size=int(planned["source_size"]),
            url=None,
            is_private=bool(planned["expected_is_private"]),
            status="ready",
        )
        db.add(media)
        db.flush()
        media.url = media_access_reference(media.id)
        db.add(
            PostAttachment(
                post_id=post.id,
                media_id=media.id,
                sort_order=int(planned["workbook_sequence"]),
            )
        )
        db.flush()
        stats["created_attachments"] += 1
    return stats


@contextmanager
def _restore_media_files_on_error(
    public_media_dir: Path,
    private_media_dir: Path,
    storage_ids: tuple[str, ...],
) -> Iterator[None]:
    roots = (
        public_media_dir.expanduser().resolve(),
        private_media_dir.expanduser().resolve(),
    )
    with TemporaryDirectory(prefix="legacy-attachment-repair-") as temporary:
        backup_root = Path(temporary)
        snapshots: list[tuple[Path, Path, int, int]] = []
        for root_index, root in enumerate(roots):
            for source in _matching_media_files(root, storage_ids):
                if source.is_symlink():
                    raise ValueError(f"symlinked selected media file is not allowed: {source.name}")
                backup = backup_root / str(root_index) / source.name
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, backup)
                source_stat = source.stat()
                snapshots.append((source, backup, source_stat.st_uid, source_stat.st_gid))
        try:
            yield
        except BaseException:
            for root in roots:
                for current in _matching_media_files(root, storage_ids):
                    current.unlink(missing_ok=True)
            for destination, backup, owner_id, group_id in snapshots:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup, destination)
                if os.name != "nt" and hasattr(os, "geteuid") and os.geteuid() == 0:
                    os.chown(destination, owner_id, group_id)
            raise


def repair_legacy_attachments(
    db: Session,
    *,
    articles_xlsx: Path,
    attachment_source_dir: Path,
    public_media_dir: Path,
    private_media_dir: Path,
    storage_ids: Sequence[str],
    apply: bool,
    legacy_reference_xlsx: Path | None = None,
    maximum_bytes: int = 20 * 1024 * 1024,
    expected_article_ids: dict[str, str] | None = None,
    expected_preflight_files: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    if maximum_bytes <= 0:
        raise ValueError("maximum_bytes must be positive")
    selected_storage_ids = _normalized_storage_ids(storage_ids)
    _, attachments, _ = load_article_workbook(articles_xlsx)
    local_files = index_local_attachment_files(attachment_source_dir)
    rows = _selected_rows(attachments, local_files, selected_storage_ids)
    _validate_expected_article_ids(rows, selected_storage_ids, expected_article_ids)
    if apply:
        _lock_repair_tables(db)
    posts = _posts_by_source_id(db, rows, lock=apply)
    reference_urls = (
        load_reference_attachment_urls(legacy_reference_xlsx)
        if legacy_reference_xlsx is not None
        else {}
    )
    planned_files = _preflight_files(
        local_files,
        rows,
        posts,
        selected_storage_ids,
        maximum_bytes,
        reference_urls,
    )
    _rows_with_fallback_filenames(
        rows,
        local_files,
        reference_urls,
        planned_files,
    )
    if (
        expected_preflight_files is not None
        and _preflight_identity(planned_files) != _preflight_identity(expected_preflight_files)
    ):
        raise ValueError("Legacy attachment repair plan changed after the confirmed dry-run.")

    preserved_plans = [
        planned
        for planned in planned_files
        if planned["storage_id"] == QA_175_EXISTING_HWP_STORAGE_ID
    ]
    insert_plans = [
        planned
        for planned in planned_files
        if planned["storage_id"] != QA_175_EXISTING_HWP_STORAGE_ID
    ]
    insert_storage_ids = tuple(str(planned["storage_id"]) for planned in insert_plans)
    if apply:
        db.scalars(select(MediaAsset).with_for_update()).all()
    validated_existing_storage_ids = _validate_preserved_existing_attachments(
        db,
        preserved_plans,
        public_media_dir=public_media_dir,
        private_media_dir=private_media_dir,
    )
    _reject_existing_insert_targets(
        db,
        insert_storage_ids,
        public_media_dir=public_media_dir,
        private_media_dir=private_media_dir,
    )

    if not apply:
        stats = Counter({"insert_candidates": len(insert_plans)})
    else:
        try:
            with _restore_media_files_on_error(
                public_media_dir,
                private_media_dir,
                insert_storage_ids,
            ):
                stats = _insert_missing_attachments(
                    db,
                    insert_plans,
                    local_files=local_files,
                    public_media_dir=public_media_dir,
                    private_media_dir=private_media_dir,
                )
                current_posts = _posts_by_source_id(db, rows, lock=False)
                if {
                    source_id: post.id for source_id, post in current_posts.items()
                } != {
                    source_id: post.id for source_id, post in posts.items()
                }:
                    raise RuntimeError(
                        "Legacy attachment repair parent posts changed before commit."
                    )
                verified_paths = _validate_applied_results(
                    db,
                    insert_plans,
                    public_media_dir=public_media_dir,
                    private_media_dir=private_media_dir,
                )
                _normalize_file_ownership(
                    verified_paths,
                    (public_media_dir, private_media_dir),
                )
                db.commit()
        except BaseException:
            db.rollback()
            raise

    return {
        "mode": "apply" if apply else "dry-run",
        "selected_storage_ids": list(selected_storage_ids),
        "validated_existing_storage_ids": validated_existing_storage_ids,
        "planned_files": planned_files,
        "attachment_stats": dict(sorted(stats.items())),
    }
