"""Repair an explicit set of legacy HWP/archive/text/notebook attachments.

The command is a dry-run by default. Apply mode requires the operator to name
the exact target database and repeat the preceding dry-run target and plan
fingerprints so a copied or altered command cannot modify another target.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings
from app.database import SessionLocal
from app.legacy_attachment_repair import (
    QA_175_176_EXPECTED_ARTICLE_IDS,
    QA_175_176_REPAIR_SET,
    _preflight_identity,
    repair_legacy_attachments,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--articles-xlsx", type=Path, required=True)
    parser.add_argument("--legacy-reference-xlsx", type=Path)
    parser.add_argument("--attachment-source-dir", type=Path, required=True)
    parser.add_argument("--public-media-dir", type=Path, default=settings.media_upload_dir)
    parser.add_argument("--private-media-dir", type=Path, default=settings.media_private_upload_dir)
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--storage-id", action="append")
    selection.add_argument("--repair-set", choices=[QA_175_176_REPAIR_SET])
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-database-name")
    parser.add_argument("--expected-target-fingerprint")
    parser.add_argument("--expected-plan-fingerprint")
    return parser.parse_args()


def _target_descriptor() -> dict[str, object]:
    database_url = make_url(settings.database_url)
    database_query = [
        [key, list(value) if isinstance(value, tuple) else [str(value)]]
        for key, value in sorted(database_url.query.items())
    ]
    return {
        "app_environment": settings.normalized_environment,
        "database_driver": database_url.drivername,
        "database_host": database_url.host or "",
        "database_port": database_url.port or 5432,
        "database_name": database_url.database or "",
        "database_username": database_url.username or "",
        "database_query_sha256": hashlib.sha256(
            json.dumps(database_query, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest(),
        "public_api_url": settings.public_api_url.rstrip("/"),
        "public_media_dir": str(settings.media_upload_dir.expanduser().resolve()),
        "private_media_dir": str(settings.media_private_upload_dir.expanduser().resolve()),
    }


def _target_fingerprint(descriptor: dict[str, object]) -> str:
    encoded = json.dumps(descriptor, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _apply_target_errors(
    descriptor: dict[str, object],
    *,
    expected_database_name: str | None,
    expected_target_fingerprint: str | None,
) -> list[str]:
    errors = []
    if descriptor["app_environment"] != "production":
        errors.append("APP_ENVIRONMENT must be production")
    if expected_database_name != descriptor["database_name"]:
        errors.append("--expected-database-name must exactly match the configured target database")
    if expected_target_fingerprint != _target_fingerprint(descriptor):
        errors.append("--expected-target-fingerprint must match the preceding dry-run target")
    return errors


def _plan_fingerprint(
    result: dict[str, object],
    *,
    target_fingerprint: str,
    public_media_dir: Path,
    private_media_dir: Path,
) -> str:
    planned_files = _preflight_identity(result["planned_files"])
    plan = {
        "target_fingerprint": target_fingerprint,
        "selected_storage_ids": result["selected_storage_ids"],
        "planned_files": planned_files,
        "public_media_dir": str(public_media_dir.expanduser().resolve()),
        "private_media_dir": str(private_media_dir.expanduser().resolve()),
    }
    return hashlib.sha256(
        json.dumps(plan, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def main() -> int:
    args = parse_args()
    if args.repair_set == QA_175_176_REPAIR_SET:
        storage_ids = tuple(QA_175_176_EXPECTED_ARTICLE_IDS)
        expected_article_ids = QA_175_176_EXPECTED_ARTICLE_IDS
    else:
        storage_ids = tuple(args.storage_id)
        expected_article_ids = None
    descriptor = _target_descriptor()
    target_fingerprint = _target_fingerprint(descriptor)
    target_errors = _apply_target_errors(
        descriptor,
        expected_database_name=args.expected_database_name,
        expected_target_fingerprint=args.expected_target_fingerprint,
    )
    if args.apply and args.public_media_dir.expanduser().resolve() != settings.media_upload_dir.expanduser().resolve():
        target_errors.append("--public-media-dir must match the configured production media directory")
    if args.apply and args.private_media_dir.expanduser().resolve() != settings.media_private_upload_dir.expanduser().resolve():
        target_errors.append("--private-media-dir must match the configured production media directory")
    if args.apply and target_errors:
        print(
            json.dumps(
                {
                    "kind": "error",
                    "message": "; ".join(target_errors),
                    "target": descriptor,
                    "target_fingerprint": target_fingerprint,
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        return 2
    if args.apply:
        try:
            settings.validate_runtime()
        except RuntimeError as exc:
            print(
                json.dumps(
                    {
                        "kind": "error",
                        "message": f"Production runtime validation failed: {exc}",
                        "target": descriptor,
                        "target_fingerprint": target_fingerprint,
                    },
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return 2

    db = SessionLocal()
    try:
        repair_arguments = {
            "articles_xlsx": args.articles_xlsx,
            "legacy_reference_xlsx": args.legacy_reference_xlsx,
            "attachment_source_dir": args.attachment_source_dir,
            "public_media_dir": args.public_media_dir,
            "private_media_dir": args.private_media_dir,
            "storage_ids": storage_ids,
            "maximum_bytes": settings.media_upload_max_bytes,
            "expected_article_ids": expected_article_ids,
        }
        preview = repair_legacy_attachments(
            db,
            **repair_arguments,
            apply=False,
        )
        plan_fingerprint = _plan_fingerprint(
            preview,
            target_fingerprint=target_fingerprint,
            public_media_dir=args.public_media_dir,
            private_media_dir=args.private_media_dir,
        )
        if args.apply and args.expected_plan_fingerprint != plan_fingerprint:
            print(
                json.dumps(
                    {
                        "kind": "error",
                        "message": "--expected-plan-fingerprint must match the preceding dry-run plan",
                        "target": descriptor,
                        "target_fingerprint": target_fingerprint,
                        "plan_fingerprint": plan_fingerprint,
                    },
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return 2
        result = (
            repair_legacy_attachments(
                db,
                **repair_arguments,
                apply=True,
                expected_preflight_files=preview["planned_files"],
            )
            if args.apply
            else preview
        )
        result["target"] = descriptor
        result["target_fingerprint"] = target_fingerprint
        result["plan_fingerprint"] = plan_fingerprint
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except Exception as exc:
        db.rollback()
        print(
            json.dumps(
                {
                    "kind": "error",
                    "message": str(exc),
                    "target": descriptor,
                    "target_fingerprint": target_fingerprint,
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
