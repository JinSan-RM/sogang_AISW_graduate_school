"""Audit and normalize club activity source links.

The command is a dry-run by default. Pass --apply only after reviewing the
current source audit, planned changes, and unresolved records.
"""

import argparse
import json
from pathlib import Path
import sys


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.club_activity_cleanup import (
    CURRENT_CLUB_NAMES,
    apply_club_activity_cleanup_plan,
    build_club_activity_cleanup_plan,
)
from app.database import SessionLocal


def _load_aliases(path: Path | None) -> dict[str, str]:
    if path is None:
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or any(not isinstance(key, str) or not isinstance(value, str) for key, value in payload.items()):
        raise ValueError("aliases must be a JSON object of string aliases to official titles")
    return payload


def _print_record(kind: str, payload: dict) -> None:
    print(json.dumps({"kind": kind, **payload}, ensure_ascii=False, sort_keys=True))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--aliases", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    try:
        aliases = _load_aliases(args.aliases)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        _print_record("error", {"message": str(exc)})
        return 2

    db = SessionLocal()
    try:
        plan = build_club_activity_cleanup_plan(
            db,
            aliases=aliases,
            expected_current_names=CURRENT_CLUB_NAMES,
        )
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
                    "source_post_id": change.source_post_id,
                    "category": change.category,
                },
            )
        for item in plan.unmatched:
            _print_record(
                "unmatched",
                {"post_id": item.post_id, "name": item.name, "reason": item.reason},
            )
        if plan.source_issues:
            db.rollback()
            return 2
        if args.apply:
            updated = apply_club_activity_cleanup_plan(db, plan)
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
