from app.models.banner import Banner


def test_home_banner_create_requires_an_image(api) -> None:
    response = api.client.post(
        "/api/banners",
        json={"placement": "home", "theme": "none"},
        headers=api.headers["admin"],
    )

    assert response.status_code == 422
    assert response.json()["code"] == "BANNER_IMAGE_REQUIRED"


def test_home_banner_keeps_at_least_one_image_after_update(api) -> None:
    created = api.client.post(
        "/api/banners",
        json={
            "placement": "home",
            "image_url": "/api/media/999/access-url",
            "image_urls": {"mobile": "/api/media/999/access-url"},
            "theme": "none",
        },
        headers=api.headers["admin"],
    )

    assert created.status_code == 200
    banner_id = created.json()["data"]["id"]

    cleared = api.client.put(
        f"/api/banners/{banner_id}",
        json={"image_url": None, "image_urls": None},
        headers=api.headers["admin"],
    )

    assert cleared.status_code == 422
    assert cleared.json()["code"] == "BANNER_IMAGE_REQUIRED"


def test_member_banner_feed_excludes_legacy_text_only_banners(api) -> None:
    with api.session() as db:
        legacy = Banner(
            placement="home",
            title="Legacy text-only banner",
            theme="navy",
            is_active=True,
        )
        db.add(legacy)
        db.commit()
        legacy_id = legacy.id

    response = api.client.get("/api/banners", headers=api.headers["other"])

    assert response.status_code == 200
    assert legacy_id not in {item["id"] for item in response.json()["data"]}
    assert all(
        item.get("image_url") or any((item.get("image_urls") or {}).values())
        for item in response.json()["data"]
    )


def test_only_admin_can_include_inactive_banners(api) -> None:
    member_response = api.client.get(
        "/api/banners",
        params={"include_inactive": True},
        headers=api.headers["other"],
    )
    admin_response = api.client.get(
        "/api/banners",
        params={"include_inactive": True},
        headers=api.headers["admin"],
    )

    assert member_response.status_code == 403
    assert admin_response.status_code == 200
