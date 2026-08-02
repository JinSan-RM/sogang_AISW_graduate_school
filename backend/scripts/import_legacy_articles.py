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
    parser.add_argument("--media-root", type=Path)
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
    if args.apply and (args.media_root is None or args.report_dir is None):
        raise SystemExit("--apply requires both --media-root and --report-dir.")

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
                media_root=args.media_root or Path("."),
                apply=args.apply,
                skip_downloads=args.skip_downloads,
            )
            summary["article_stats"] = dict(sorted(article_stats.items()))
            summary["comment_stats"] = dict(sorted(comment_stats.items()))
            summary["attachment_stats"] = dict(sorted(attachment_stats.items()))
            if args.apply:
                db.commit()
                if args.report_dir:
                    paths = export_ledger_report(db, args.report_dir, summary)
                    summary["reports"] = [str(path) for path in paths]
            else:
                db.rollback()
    finally:
        engine.dispose()
    print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
