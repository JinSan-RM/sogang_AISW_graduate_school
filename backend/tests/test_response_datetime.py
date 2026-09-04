from datetime import date, datetime, timedelta, timezone

from app.response import success_response


def test_success_response_marks_datetime_values_as_utc_without_changing_dates() -> None:
    payload = success_response(
        {
            "created_at": datetime(2026, 8, 31, 15, 0),
            "updated_at": datetime(2026, 9, 1, 0, 0, tzinfo=timezone(timedelta(hours=9))),
            "event_date": date(2026, 9, 1),
            "nested": [{"deleted_at": datetime(2026, 9, 1, 1, 2, 3)}],
        }
    )

    assert payload["data"]["created_at"] == "2026-08-31T15:00:00Z"
    assert payload["data"]["updated_at"] == "2026-08-31T15:00:00Z"
    assert payload["data"]["event_date"] == date(2026, 9, 1)
    assert payload["data"]["nested"][0]["deleted_at"] == "2026-09-01T01:02:03Z"
