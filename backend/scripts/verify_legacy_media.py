from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.legacy_import import _detected_content_type, _sha256_file  # noqa: E402
from app.media_service import media_access_reference  # noqa: E402
from app.models.audit import LegacyImportRecord  # noqa: E402
from app.models.faq import FAQAttachment  # noqa: E402
from app.models.media import MediaAsset, PostAttachment  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify that imported legacy media rows and files survived a local or server restore."
    )
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--public-media-dir", type=Path, required=True)
    parser.add_argument("--private-media-dir", type=Path, required=True)
    parser.add_argument(
        "--expected-manifest-sha256",
        help="Optional manifest hash recorded before transfer; mismatch fails verification.",
    )
    parser.add_argument("--report", type=Path)
    return parser.parse_args()


def verify_legacy_media(
    db: Session,
    *,
    public_media_dir: Path,
    private_media_dir: Path,
    expected_manifest_sha256: str | None = None,
) -> dict:
    public_root = public_media_dir.expanduser().resolve()
    private_root = private_media_dir.expanduser().resolve()
    if public_root == private_root:
        raise ValueError("Public and private media directories must be distinct.")

    records = db.scalars(
        select(LegacyImportRecord)
        .where(
            LegacyImportRecord.entity_type == "attachment",
            LegacyImportRecord.status == "imported",
        )
        .order_by(LegacyImportRecord.id)
    ).all()
    failures: list[dict[str, str | int]] = []
    counts: Counter = Counter()
    manifest_entries: set[str] = set()
    verified_media_ids: set[int] = set()

    for record in records:
        counts["imported_records"] += 1
        if record.target_table != "media_assets" or record.target_id is None:
            failures.append({"record_id": record.id, "reason": "missing_media_target"})
            continue
        media = db.get(MediaAsset, record.target_id)
        if media is None:
            failures.append({"record_id": record.id, "reason": "missing_media_row"})
            continue
        if media.status != "ready":
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "media_not_ready"})
            continue
        if Path(media.stored_filename).name != media.stored_filename:
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "unsafe_stored_filename"})
            continue
        path = (private_root if media.is_private else public_root) / media.stored_filename
        if not path.is_file():
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "missing_media_file"})
            continue

        details = record.redacted_details or {}
        actual_size = path.stat().st_size
        actual_sha256 = _sha256_file(path)
        expected_sha256 = str(details.get("sha256") or "")
        detected_content_type = _detected_content_type(path, media.content_type)
        if actual_size != media.file_size:
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "file_size_mismatch"})
            continue
        if expected_sha256 and actual_sha256 != expected_sha256:
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "file_hash_mismatch"})
            continue
        if detected_content_type != media.content_type:
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "content_type_mismatch"})
            continue
        if media.url != media_access_reference(media.id):
            failures.append({"record_id": record.id, "media_id": media.id, "reason": "unstable_media_reference"})
            continue

        post_attachment_id = details.get("post_attachment_id")
        if post_attachment_id is not None:
            link = db.get(PostAttachment, int(post_attachment_id))
            if link is None or link.media_id != media.id:
                failures.append({"record_id": record.id, "media_id": media.id, "reason": "broken_post_attachment"})
                continue
        faq_attachment_id = details.get("faq_attachment_id")
        if faq_attachment_id is not None:
            faq_link = db.get(FAQAttachment, int(faq_attachment_id))
            if faq_link is None or faq_link.media_id != media.id:
                failures.append({"record_id": record.id, "media_id": media.id, "reason": "broken_faq_attachment"})
                continue

        if media.id not in verified_media_ids:
            relative_path = f"{'private' if media.is_private else 'public'}/{media.stored_filename}"
            manifest_entries.add(f"{relative_path}\0{actual_size}\0{actual_sha256}")
            verified_media_ids.add(media.id)
            counts["verified_files"] += 1
            counts["verified_bytes"] += actual_size
        counts["verified_records"] += 1

    manifest = hashlib.sha256()
    for entry in sorted(manifest_entries):
        manifest.update(entry.encode("utf-8"))
        manifest.update(b"\n")
    manifest_sha256 = manifest.hexdigest()
    if expected_manifest_sha256 and manifest_sha256.lower() != expected_manifest_sha256.lower():
        failures.append({"record_id": 0, "reason": "manifest_hash_mismatch"})

    return {
        "status": "ok" if not failures else "failed",
        "counts": dict(sorted(counts.items())),
        "manifest_sha256": manifest_sha256,
        "failures": failures,
    }


def main() -> None:
    args = parse_args()
    engine = create_engine(args.database_url, future=True)
    try:
        with Session(engine, future=True) as db:
            result = verify_legacy_media(
                db,
                public_media_dir=args.public_media_dir,
                private_media_dir=args.private_media_dir,
                expected_manifest_sha256=args.expected_manifest_sha256,
            )
    finally:
        engine.dispose()

    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    if result["status"] != "ok":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
