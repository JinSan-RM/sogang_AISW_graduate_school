from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.models.event import Event
from app.models.notification import Notification


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


def test_event_api_marks_utc_values_without_changing_the_korea_schedule(api) -> None:
    with api.session() as db:
        opening = _event("개강", _kst(2026, 9, 1, 0), _kst(2026, 9, 1, 1))
        db.add(opening)
        db.commit()
        db.refresh(opening)
        event_id = opening.id

    response = api.client.get(f"/api/events/{event_id}", headers=api.headers["owner"])

    assert response.status_code == 200
    assert response.json()["data"]["start_at"] == "2026-08-31T15:00:00Z"
    assert response.json()["data"]["end_at"] == "2026-08-31T16:00:00Z"


def test_admin_event_create_normalizes_korea_offset_to_utc_storage(api) -> None:
    response = api.client.post(
        "/api/events",
        json={
            "title": "개강",
            "category": "academic",
            "start_at": "2026-09-01T00:00:00+09:00",
            "end_at": None,
        },
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    assert response.json()["data"]["start_at"] == "2026-08-31T15:00:00Z"
    event_id = response.json()["data"]["id"]
    with api.session() as db:
        assert db.get(Event, event_id).start_at == datetime(2026, 8, 31, 15, 0)


def test_admin_event_update_normalizes_korea_offset_to_utc_storage(api) -> None:
    with api.session() as db:
        event = _event("변경 전 일정", _kst(2026, 8, 31, 9))
        db.add(event)
        db.commit()
        event_id = event.id

    response = api.client.put(
        f"/api/events/{event_id}",
        json={
            "title": "개강",
            "category": "academic",
            "start_at": "2026-09-01T00:00:00+09:00",
            "end_at": None,
        },
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    assert response.json()["data"]["start_at"] == "2026-08-31T15:00:00Z"
    with api.session() as db:
        assert db.get(Event, event_id).start_at == datetime(2026, 8, 31, 15, 0)


def test_event_reminders_use_the_full_korea_calendar_day(api) -> None:
    with api.session() as db:
        previous_day = _event("전날 마지막 일정", _kst(2026, 8, 31, 23, 59))
        opening = _event("개강", _kst(2026, 9, 1, 0))
        final_minute = _event("9월 1일 마지막 일정", _kst(2026, 9, 1, 23, 59))
        next_day = _event("다음 날 첫 일정", _kst(2026, 9, 2, 0))
        db.add_all([previous_day, opening, final_minute, next_day])
        db.commit()
        expected_event_ids = {opening.id, final_minute.id}
        excluded_event_ids = {previous_day.id, next_day.id}

    response = api.client.post(
        "/api/events/admin/dispatch-reminders",
        params={"target_date": "2026-09-01"},
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    with api.session() as db:
        notified_event_ids = set(
            db.scalars(
                select(Notification.event_id).where(Notification.notification_type == "event")
            ).all()
        )
    assert expected_event_ids <= notified_event_ids
    assert excluded_event_ids.isdisjoint(notified_event_ids)
