"""Audit and normalize legacy study activity titles and confirmed source links.

The command is a dry-run by default. Pass --apply after reviewing the emitted
changes and unmatched source records.
"""

import argparse
import json
from pathlib import Path
import sys


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.study_activity_cleanup import (
    apply_study_activity_cleanup_plan,
    build_study_activity_cleanup_plan,
)


def _print_record(kind: str, payload: dict) -> None:
    print(json.dumps({"kind": kind, **payload}, ensure_ascii=False, sort_keys=True))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        plan = build_study_activity_cleanup_plan(db)
        _print_record(
            "summary",
            {
                "mode": "apply" if args.apply else "dry-run",
                "changes": len(plan.changes),
                "unchanged": plan.unchanged_count,
                "unmatched": len(plan.unmatched),
                "source_issues": len(plan.source_issues),
            },
        )
        for issue in plan.source_issues:
            _print_record("source_issue", {"message": issue})
        for change in plan.changes:
            _print_record(
                "change",
                {
                    "post_id": change.post_id,
                    "title": change.title,
                    "source_post_id": change.source_post_id,
                },
            )
        for item in plan.unmatched:
            _print_record(
                "unmatched",
                {
                    "post_id": item.post_id,
                    "legacy_write_id": item.legacy_write_id,
                    "reason": item.reason,
                },
            )
        if args.apply:
            updated = apply_study_activity_cleanup_plan(db, plan)
            db.commit()
            _print_record("applied", {"updated": updated})
        else:
            db.rollback()
        return 0
    except Exception as exc:
        db.rollback()
        _print_record("error", {"message": str(exc)})
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
