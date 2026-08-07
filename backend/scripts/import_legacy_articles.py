from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.legacy_import import (  # noqa: E402
    export_ledger_report,
    import_articles_and_specials,
    import_attachments,
    import_comments,
    index_local_attachment_files,
    load_article_workbook,
    load_comment_workbook,
    load_reference_attachment_urls,
    summarize_sources,
    validate_database_target,
)


def _file_fingerprint(path: Path) -> dict[str, str | int]:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest.hexdigest()}


def _raw_csv_summary(path: Path) -> dict[str, str | int]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        row_count = sum(1 for _ in csv.reader(handle))
    return {**_file_fingerprint(path), "rows_including_header": row_count}


def parse_args() -> argparse.Namespace:
    data_dir = REPO_ROOT / "data"
    parser = argparse.ArgumentParser(description="Safely reconcile cleaned Swing2App data into a review database.")
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--articles-xlsx", type=Path, default=data_dir / "board_articles_ver2.xlsx")
    parser.add_argument("--comments-xlsx", type=Path, default=data_dir / "comments.xlsx")
    parser.add_argument("--legacy-reference-xlsx", type=Path, default=data_dir / "board_articles(구분).xlsx")
    parser.add_argument("--raw-csv", type=Path, default=data_dir / "정보통신대학원 어플 작성글.csv")
    parser.add_argument(
        "--attachment-source-dir",
        type=Path,
        default=data_dir / "attachments" / "attachments",
        help="Local files named by fileStorageId. This strict local source is preferred over CDN URLs.",
    )
    parser.add_argument(
        "--download-attachments",
        action="store_true",
        help="Explicitly use legacy remote URLs instead of the local attachment source.",
    )
    parser.add_argument("--media-root", type=Path, help="Legacy parent containing public/ and private/.")
    parser.add_argument("--public-media-dir", type=Path)
    parser.add_argument("--private-media-dir", type=Path)
    parser.add_argument("--report-dir", type=Path)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--skip-downloads", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--article-id")
    parser.add_argument("--sheet")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    database_name = validate_database_target(args.database_url)
    for path in (args.articles_xlsx, args.comments_xlsx, args.legacy_reference_xlsx, args.raw_csv):
        if not path.exists():
            raise SystemExit(f"Required source file does not exist: {path}")
    explicit_media_dirs = args.public_media_dir is not None and args.private_media_dir is not None
    if (args.public_media_dir is None) != (args.private_media_dir is None):
        raise SystemExit("--public-media-dir and --private-media-dir must be provided together.")
    if args.apply and ((args.media_root is None and not explicit_media_dirs) or args.report_dir is None):
        raise SystemExit(
            "--apply requires --report-dir and either --media-root or both explicit media directories."
        )
    attachment_source_dir = None if args.download_attachments else args.attachment_source_dir
    if attachment_source_dir is not None and not attachment_source_dir.is_dir():
        raise SystemExit(f"Local attachment source does not exist: {attachment_source_dir}")

    articles, attachments, duplicates = load_article_workbook(args.articles_xlsx)
    comments = load_comment_workbook(args.comments_xlsx)
    if args.sheet:
        articles = [row for row in articles if row.sheet == args.sheet]
    if args.article_id:
        articles = [row for row in articles if row.source_id == args.article_id]
        comments = [row for row in comments if str(row.data.get("article_id")) == args.article_id]
        attachments = [row for row in attachments if str(row.data.get("writeId")) == args.article_id]
    selected_ids = {row.source_id for row in articles}
    if args.sheet or args.article_id:
        comments = [row for row in comments if str(row.data.get("article_id")) in selected_ids]
        attachments = [row for row in attachments if str(row.data.get("writeId")) in selected_ids]

    summary = summarize_sources(articles, comments, attachments, duplicates)
    summary["database"] = database_name
    summary["source_files"] = {
        "articles": _file_fingerprint(args.articles_xlsx),
        "comments": _file_fingerprint(args.comments_xlsx),
        "legacy_reference": _file_fingerprint(args.legacy_reference_xlsx),
        "raw_csv": _raw_csv_summary(args.raw_csv),
    }
    reference_urls = load_reference_attachment_urls(args.legacy_reference_xlsx)
    summary["reference_attachment_urls"] = len(reference_urls)
    if attachment_source_dir is not None:
        local_files = index_local_attachment_files(attachment_source_dir)
        expected_storage_ids = {
            str(row.data.get("fileStorageId")).strip()
            for row in attachments
            if row.data.get("fileStorageId") not in (None, "")
        }
        missing_storage_ids = sorted(expected_storage_ids.difference(local_files))
        summary["attachment_source"] = {
            "mode": "local",
            "path": str(attachment_source_dir.resolve()),
            "files": len(local_files),
            "expected_storage_ids": len(expected_storage_ids),
            "matched_storage_ids": len(expected_storage_ids.intersection(local_files)),
            "missing_storage_ids": missing_storage_ids,
            "unused_local_files": len(set(local_files).difference(expected_storage_ids)),
            "bytes": sum(path.stat().st_size for path in local_files.values()),
        }
        if missing_storage_ids:
            raise SystemExit(
                "Local attachment source is incomplete; missing fileStorageId values: "
                + ", ".join(missing_storage_ids[:20])
            )
    else:
        summary["attachment_source"] = {"mode": "remote_download"}

    engine = create_engine(args.database_url, future=True)
    try:
        with Session(engine, autoflush=False, future=True) as db:
            posts, article_stats, _ = import_articles_and_specials(
                db,
                articles,
                duplicates,
                apply=args.apply,
                limit=args.limit,
            )
            comment_stats = import_comments(
                db,
                comments,
                posts,
                apply=args.apply,
                reconcile_untracked=not (args.limit or args.sheet or args.article_id),
            )
            attachment_stats = import_attachments(
                db,
                attachments,
                reference_urls,
                posts,
                media_root=args.media_root or (None if explicit_media_dirs else Path(".")),
                public_media_dir=args.public_media_dir,
                private_media_dir=args.private_media_dir,
                attachment_source_dir=attachment_source_dir,
                apply=args.apply,
                skip_downloads=args.skip_downloads,
            )
            summary["article_stats"] = dict(sorted(article_stats.items()))
            summary["comment_stats"] = dict(sorted(comment_stats.items()))
            summary["attachment_stats"] = dict(sorted(attachment_stats.items()))
            if args.apply:
                fatal_attachment_keys = (
                    "failed_attachments",
                    "invalid_attachment_rows",
                    "missing_attachment_urls",
                    "missing_local_attachment_files",
                    "orphan_attachments",
                )
                fatal_attachment_counts = {
                    key: int(attachment_stats.get(key, 0))
                    for key in fatal_attachment_keys
                    if attachment_stats.get(key, 0)
                }
                if fatal_attachment_counts:
                    raise RuntimeError(
                        "Attachment import is incomplete; the transaction was rolled back: "
                        + json.dumps(fatal_attachment_counts, sort_keys=True)
                    )
                db.commit()
                if args.report_dir:
                    paths = export_ledger_report(db, args.report_dir, summary)
                    summary["reports"] = [str(path) for path in paths]
            else:
                db.rollback()
                if args.report_dir:
                    args.report_dir.mkdir(parents=True, exist_ok=True)
                    dry_run_path = args.report_dir / "migration-dry-run-summary.json"
                    summary["reports"] = [str(dry_run_path)]
                    dry_run_path.write_text(
                        json.dumps(summary, ensure_ascii=False, indent=2, default=str),
                        encoding="utf-8",
                    )
    finally:
        engine.dispose()
    print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
