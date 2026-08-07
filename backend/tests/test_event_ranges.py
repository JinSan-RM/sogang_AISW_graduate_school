from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.models.event import Event


def _kst(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> datetime:
    return (
        datetime(year, month, day, hour, minute, tzinfo=ZoneInfo("Asia/Seoul"))
        .astimezone(timezone.utc)
        .replace(tzinfo=None)
    )


def _event(title: str, start_at: datetime, end_at: datetime | None = None) -> Event:
    return Event(
        title=title,
        category="event",
        start_at=start_at,
        end_at=end_at,
        created_by=3,
    )


def test_month_query_returns_every_event_overlapping_the_requested_range(api) -> None:
    with api.session() as db:
        db.add_all(
            [
                _event("starts before month", _kst(2026, 7, 30, 9), _kst(2026, 8, 2, 18)),
                _event("inside month", _kst(2026, 8, 15, 9)),
                _event("ends after month", _kst(2026, 8, 30, 9), _kst(2026, 9, 2, 18)),
                _event("covers month", _kst(2026, 7, 1, 9), _kst(2026, 9, 30, 18)),
                _event("ended before month", _kst(2026, 7, 1, 9), _kst(2026, 7, 31, 23, 59)),
                _event("starts after month", _kst(2026, 9, 1, 0)),
            ]
        )
        db.commit()

    response = api.client.get(
        "/api/events",
        params={"from_date": "2026-08-01", "to_date": "2026-08-31"},
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    titles = {item["title"] for item in response.json()["data"]}
    assert titles == {"starts before month", "inside month", "ends after month", "covers month"}


def test_day_query_includes_multi_day_events_on_their_inclusive_end_date(api) -> None:
    with api.session() as db:
        db.add_all(
            [
                _event("spans selected day", _kst(2026, 7, 30, 9), _kst(2026, 8, 2, 18)),
                _event("ends at selected day start", _kst(2026, 8, 1, 9), _kst(2026, 8, 2, 0)),
                _event("single selected day", _kst(2026, 8, 2, 12)),
                _event("ended yesterday", _kst(2026, 7, 30, 9), _kst(2026, 8, 1, 23, 59)),
                _event("starts tomorrow", _kst(2026, 8, 3, 0)),
            ]
        )
        db.commit()

    response = api.client.get(
        "/api/events",
        params={"from_date": "2026-08-02", "to_date": "2026-08-02"},
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    titles = {item["title"] for item in response.json()["data"]}
    assert titles == {"spans selected day", "ends at selected day start", "single selected day"}
