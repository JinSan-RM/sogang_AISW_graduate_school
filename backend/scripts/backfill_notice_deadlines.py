"""Infer missing notice deadlines from text, related events, or publish date.

The command is dry-run by default. Pass --apply to update only rows whose
deadline_at is currently NULL.
"""

import argparse
from collections import Counter
from datetime import datetime, time, timedelta
import re
from pathlib import Path
import sys

from sqlalchemy import select


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.models.event import Event
from app.models.post import Post


FULL_DATE_PATTERNS = (
    re.compile(r"(?P<year>20\d{2})\s*[.\-/년]\s*(?P<month>\d{1,2})\s*[.\-/월]\s*(?P<day>\d{1,2})\s*일?"),
)
MONTH_DAY_PATTERN = re.compile(r"(?<!\d)(?P<month>1[0-2]|0?[1-9])\s*월\s*(?P<day>3[01]|[12]?\d)\s*일")


def _candidate_dates(post: Post) -> list[datetime]:
    text = f"{post.title}\n{post.content or ''}"
    dates: list[datetime] = []
    for pattern in FULL_DATE_PATTERNS:
        for match in pattern.finditer(text):
            try:
                dates.append(datetime(int(match.group("year")), int(match.group("month")), int(match.group("day")), 18, 0))
            except ValueError:
                continue
    for match in MONTH_DAY_PATTERN.finditer(text):
        month = int(match.group("month"))
        day = int(match.group("day"))
        year = post.created_at.year
        try:
            candidate = datetime(year, month, day, 18, 0)
        except ValueError:
            continue
        if candidate < post.created_at - timedelta(days=90):
            candidate = candidate.replace(year=year + 1)
        dates.append(candidate)

    lower = post.created_at - timedelta(days=90)
    upper = post.created_at + timedelta(days=370)
    return sorted({date for date in dates if lower <= date <= upper})


def _related_event_deadline(post: Post, events: list[Event]) -> datetime | None:
    normalized_title = post.title.lower().replace("공지", "").strip()
    for event in events:
        event_title = event.title.lower().strip()
        if len(event_title) >= 2 and (event_title in normalized_title or normalized_title in event_title):
            return event.start_at
    return None


def infer_deadline(post: Post, events: list[Event]) -> tuple[datetime, str]:
    related_event = _related_event_deadline(post, events)
    if related_event is not None:
        return related_event, "event"
    candidates = _candidate_dates(post)
    if candidates:
        return candidates[-1], "text"
    fallback_day = (post.created_at + timedelta(days=14)).date()
    return datetime.combine(fallback_day, time(hour=18)), "publish+14d"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--sample-size", type=int, default=20)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        events = db.scalars(select(Event).order_by(Event.start_at.asc())).all()
        posts = db.scalars(
            select(Post)
            .where(Post.is_notice.is_(True), Post.deleted_at.is_(None), Post.deadline_at.is_(None))
            .order_by(Post.created_at.asc(), Post.id.asc())
        ).all()
        plan = [(post, *infer_deadline(post, events)) for post in posts]
        counts = Counter(source for _, _, source in plan)
        print({"mode": "apply" if args.apply else "dry-run", "rows": len(plan), "sources": dict(counts)})
        for post, deadline, source in plan[: max(args.sample_size, 0)]:
            print({"id": post.id, "title": post.title, "created_at": post.created_at.isoformat(), "deadline_at": deadline.isoformat(), "source": source})
        if args.apply:
            for post, deadline, _ in plan:
                post.deadline_at = deadline
            db.commit()
            print({"updated": len(plan)})
    finally:
        db.close()


if __name__ == "__main__":
    main()
