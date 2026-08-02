from datetime import date, datetime, timezone

import pytest

from app.models.media import MediaAsset
from app.models.post import Post
from app.models.post_extension import PostMutualAid
from app.routers import posts as posts_router


def _create_private_evidence(api, suffix: str) -> int:
    with api.session() as db:
        evidence = MediaAsset(
            owner_id=1,
            original_filename=f"evidence-{suffix}.pdf",
            stored_filename=f"private-evidence-{suffix}.pdf",
            content_type="application/pdf",
            file_size=123,
            url=f"/private-uploads/private-evidence-{suffix}.pdf",
            is_private=True,
            status="ready",
        )
        db.add(evidence)
        db.commit()
        return evidence.id


def _payload(evidence_id: int, event_date: str, *, content: str = "") -> dict:
    return {
        "title": "Wedding mutual-aid request",
        "content": content,
        "category": "wedding",
        "metadata": {"event_date": event_date, "relation": "self"},
        "attachment_ids": [evidence_id],
    }


def test_mutual_aid_minimum_date_uses_seoul_calendar_day() -> None:
    assert posts_router._minimum_mutual_aid_event_date(
        datetime(2026, 8, 1, 14, 59, 59, tzinfo=timezone.utc)
    ) == date(2026, 8, 3)
    assert posts_router._minimum_mutual_aid_event_date(
        datetime(2026, 8, 1, 15, 0, 0, tzinfo=timezone.utc)
    ) == date(2026, 8, 4)


def test_mutual_aid_create_rejects_dates_before_d_plus_two(
    api,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    evidence_id = _create_private_evidence(api, "create-boundary")
    monkeypatch.setattr(posts_router, "_minimum_mutual_aid_event_date", lambda: date(2026, 8, 4))

    for event_date in ("2026.08.01", "2026.08.02", "2026.08.03"):
        response = api.client.post(
            "/api/boards/1/posts",
            json=_payload(evidence_id, event_date),
            headers=api.headers["owner"],
        )
        assert response.status_code == 422
        assert response.json() == {
            "status": "error",
            "message": "Mutual-aid event date must be at least two days from today.",
            "code": "MUTUAL_AID_DATE_TOO_SOON",
        }

    allowed = api.client.post(
        "/api/boards/1/posts",
        json=_payload(evidence_id, "2026.08.04"),
        headers=api.headers["owner"],
    )
    assert allowed.status_code == 200
    with api.session() as db:
        mutual_aid = db.query(PostMutualAid).filter(PostMutualAid.post_id == allowed.json()["data"]["id"]).one()
        assert mutual_aid.event_date == date(2026, 8, 4)


def test_mutual_aid_update_validates_only_a_changed_event_date(
    api,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    evidence_id = _create_private_evidence(api, "update-boundary")
    monkeypatch.setattr(posts_router, "_minimum_mutual_aid_event_date", lambda: date(2026, 8, 4))
    created = api.client.post(
        "/api/boards/1/posts",
        json=_payload(evidence_id, "2026-08-04"),
        headers=api.headers["owner"],
    )
    assert created.status_code == 200
    post_id = created.json()["data"]["id"]

    rejected = api.client.put(
        f"/api/posts/{post_id}",
        json=_payload(evidence_id, "2026-08-03", content="must roll back"),
        headers=api.headers["owner"],
    )
    assert rejected.status_code == 422
    assert rejected.json()["code"] == "MUTUAL_AID_DATE_TOO_SOON"
    with api.session() as db:
        assert db.get(Post, post_id).content == ""
        assert db.query(PostMutualAid).filter(PostMutualAid.post_id == post_id).one().event_date == date(2026, 8, 4)

    monkeypatch.setattr(posts_router, "_minimum_mutual_aid_event_date", lambda: date(2026, 8, 10))
    unchanged_legacy_date = api.client.put(
        f"/api/posts/{post_id}",
        json=_payload(evidence_id, "2026-08-04", content="updated remarks"),
        headers=api.headers["owner"],
    )
    assert unchanged_legacy_date.status_code == 200
    with api.session() as db:
        assert db.get(Post, post_id).content == "updated remarks"
        assert db.query(PostMutualAid).filter(PostMutualAid.post_id == post_id).one().event_date == date(2026, 8, 4)
