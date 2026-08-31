import pytest


CANONICAL_CATEGORIES = ("academic", "event", "other")
LEGACY_CATEGORIES = ("exam", "council", "external")


def _payload(category: str, title: str) -> dict:
    return {
        "title": title,
        "description": "기존 일정 설명",
        "location": "다산관",
        "category": category,
        "color": None,
        "start_at": "2026-09-01T09:00:00Z",
        "end_at": "2026-09-01T10:00:00Z",
    }


@pytest.mark.parametrize("category", CANONICAL_CATEGORIES)
def test_canonical_event_categories_create_update_and_read(api, category: str) -> None:
    created = api.client.post(
        "/api/events",
        headers=api.headers["admin"],
        json=_payload(category, "원본 제목"),
    )
    assert created.status_code == 200
    event_id = created.json()["data"]["id"]
    assert created.json()["data"]["category"] == category

    updated = api.client.put(
        f"/api/events/{event_id}",
        headers=api.headers["admin"],
        json=_payload(category, "제목만 수정"),
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["category"] == category

    detail = api.client.get(f"/api/events/{event_id}", headers=api.headers["owner"])
    assert detail.status_code == 200
    assert detail.json()["data"]["category"] == category


@pytest.mark.parametrize("category", LEGACY_CATEGORIES)
def test_legacy_event_categories_are_rejected_on_create(api, category: str) -> None:
    response = api.client.post(
        "/api/events",
        headers=api.headers["admin"],
        json=_payload(category, "레거시 일정"),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("category", LEGACY_CATEGORIES)
def test_legacy_event_categories_are_rejected_on_update(api, category: str) -> None:
    created = api.client.post(
        "/api/events",
        headers=api.headers["admin"],
        json=_payload("academic", "기존 일정"),
    )
    event_id = created.json()["data"]["id"]

    response = api.client.put(
        f"/api/events/{event_id}",
        headers=api.headers["admin"],
        json=_payload(category, "레거시 분류로 수정"),
    )

    assert response.status_code == 422
