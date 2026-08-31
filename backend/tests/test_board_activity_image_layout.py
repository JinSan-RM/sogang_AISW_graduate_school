from __future__ import annotations

from copy import deepcopy

from app.models.board import Board


LAYOUT_KEY = "activity_image_layout"


def _rule(**overrides) -> dict:
    value = {
        "max_width": 1200,
        "height": None,
        "max_height": 800,
        "fit": "contain",
        "expandable": True,
    }
    value.update(overrides)
    return value


def _layout(**overrides) -> dict:
    value = {
        "version": 1,
        "default": _rule(),
        "landscape": None,
        "portrait": None,
    }
    value.update(overrides)
    return value


def _create_payload(*, slug: str, board_type: str, metadata: dict | None) -> dict:
    return {
        "name": slug,
        "slug": slug,
        "category": "participation",
        "board_type": board_type,
        "description": "layout validation test",
        "sort_order": 90,
        "read_permission": "user",
        "write_permission": "user",
        "metadata": metadata,
    }


def _insert_board(api, *, slug: str, board_type: str, metadata: dict | None = None) -> int:
    with api.session() as db:
        board = Board(
            name=slug,
            slug=slug,
            category="participation",
            board_type=board_type,
            read_permission="user",
            write_permission="user",
            metadata_json=metadata,
        )
        db.add(board)
        db.commit()
        db.refresh(board)
        return board.id


def _assert_invalid_layout(response) -> None:
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_ACTIVITY_IMAGE_LAYOUT"


def test_create_activity_board_persists_valid_layout_and_other_metadata(api) -> None:
    layout = _layout(
        default=_rule(max_width=1600, height=120, max_height=None, fit="cover", expandable=False),
        portrait=_rule(max_width=None, height=None, max_height=2000),
    )
    metadata = {"legacy_setting": {"keep": True}, LAYOUT_KEY: layout}

    response = api.client.post(
        "/api/boards/admin",
        json=_create_payload(slug="activity-layout-create", board_type="activity_certification", metadata=metadata),
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    board_id = response.json()["data"]["id"]
    assert response.json()["data"]["metadata"] == metadata
    with api.session() as db:
        assert db.get(Board, board_id).metadata_json == metadata


def test_update_activity_board_persists_valid_layout_and_other_metadata(api) -> None:
    board_id = _insert_board(
        api,
        slug="activity-layout-update",
        board_type="activity_certification",
        metadata={"legacy_setting": "old"},
    )
    layout = _layout(
        landscape=_rule(max_width=1400, height=360, max_height=None, fit="cover", expandable=False),
        portrait=None,
    )
    metadata = {
        "legacy_setting": "keep",
        "future_setting": {"unknown": [1, 2, 3]},
        LAYOUT_KEY: layout,
    }

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"metadata": metadata},
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    assert response.json()["data"]["metadata"] == metadata
    with api.session() as db:
        assert db.get(Board, board_id).metadata_json == metadata


def test_activity_board_allows_other_metadata_without_layout(api) -> None:
    metadata = {"legacy_setting": {"keep": True}}

    response = api.client.post(
        "/api/boards/admin",
        json=_create_payload(
            slug="activity-without-layout",
            board_type="activity_certification",
            metadata=metadata,
        ),
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    assert response.json()["data"]["metadata"] == metadata


def test_update_rejects_unknown_fit_without_changing_metadata(api) -> None:
    original_metadata = {"legacy_setting": "keep"}
    board_id = _insert_board(
        api,
        slug="activity-layout-fit",
        board_type="activity_certification",
        metadata=original_metadata,
    )
    invalid_layout = _layout(default=_rule(fit="stretch"))

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"metadata": {"legacy_setting": "keep", LAYOUT_KEY: invalid_layout}},
        headers=api.headers["admin"],
    )

    _assert_invalid_layout(response)
    with api.session() as db:
        assert db.get(Board, board_id).metadata_json == original_metadata


def test_create_activity_board_rejects_invalid_layout(api) -> None:
    response = api.client.post(
        "/api/boards/admin",
        json=_create_payload(
            slug="activity-layout-invalid-create",
            board_type="activity_certification",
            metadata={LAYOUT_KEY: _layout(default=_rule(fit="stretch"))},
        ),
        headers=api.headers["admin"],
    )

    _assert_invalid_layout(response)


def test_update_rejects_out_of_range_layout_dimensions(api) -> None:
    board_id = _insert_board(
        api,
        slug="activity-layout-ranges",
        board_type="activity_certification",
        metadata={"legacy_setting": "keep"},
    )
    invalid_dimensions = (
        ("max_width below minimum", "max_width", 119),
        ("max_width above maximum", "max_width", 1601),
        ("height below minimum", "height", 119),
        ("height above maximum", "height", 1601),
        ("max_height below minimum", "max_height", 119),
        ("max_height above maximum", "max_height", 2001),
    )

    for label, field, value in invalid_dimensions:
        rule = _rule(max_height=None) if field == "height" else _rule(height=None)
        rule[field] = value
        response = api.client.put(
            f"/api/boards/admin/{board_id}",
            json={"metadata": {LAYOUT_KEY: _layout(default=rule)}},
            headers=api.headers["admin"],
        )
        assert response.status_code == 422, label
        assert response.json()["code"] == "INVALID_ACTIVITY_IMAGE_LAYOUT", label


def test_update_rejects_height_combined_with_max_height(api) -> None:
    board_id = _insert_board(
        api,
        slug="activity-layout-exclusive-height",
        board_type="activity_certification",
    )
    invalid_layout = _layout(default=_rule(height=240, max_height=800))

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"metadata": {LAYOUT_KEY: invalid_layout}},
        headers=api.headers["admin"],
    )

    _assert_invalid_layout(response)


def test_update_rejects_missing_fields_invalid_version_and_extra_layout_or_rule_keys(api) -> None:
    board_id = _insert_board(
        api,
        slug="activity-layout-shape",
        board_type="activity_certification",
    )
    missing_default = _layout()
    missing_default.pop("default")
    wrong_version = _layout(version=2)
    boolean_version = _layout(version=True)
    extra_layout_key = _layout(unexpected=True)
    extra_rule_key = _layout(default={**_rule(), "unexpected": True})
    missing_rule_key = _layout(default={key: value for key, value in _rule().items() if key != "fit"})
    invalid_landscape_override = _layout(landscape=_rule(fit="stretch"))

    for label, invalid_layout in (
        ("missing default", missing_default),
        ("wrong version", wrong_version),
        ("boolean version", boolean_version),
        ("extra layout key", extra_layout_key),
        ("extra rule key", extra_rule_key),
        ("missing rule key", missing_rule_key),
        ("invalid landscape override", invalid_landscape_override),
    ):
        response = api.client.put(
            f"/api/boards/admin/{board_id}",
            json={"metadata": {LAYOUT_KEY: invalid_layout}},
            headers=api.headers["admin"],
        )
        assert response.status_code == 422, label
        assert response.json()["code"] == "INVALID_ACTIVITY_IMAGE_LAYOUT", label


def test_update_rejects_explicit_null_board_type_without_changing_board(api) -> None:
    original_metadata = {"legacy_setting": "keep"}
    board_id = _insert_board(
        api,
        slug="activity-layout-null-board-type",
        board_type="activity_certification",
        metadata=deepcopy(original_metadata),
    )

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"board_type": None},
        headers=api.headers["admin"],
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    with api.session() as db:
        board = db.get(Board, board_id)
        assert board.board_type == "activity_certification"
        assert board.metadata_json == original_metadata


def test_create_non_activity_board_rejects_activity_image_layout(api) -> None:
    response = api.client.post(
        "/api/boards/admin",
        json=_create_payload(
            slug="post-with-activity-layout",
            board_type="post",
            metadata={LAYOUT_KEY: _layout()},
        ),
        headers=api.headers["admin"],
    )

    _assert_invalid_layout(response)


def test_update_non_activity_board_rejects_activity_image_layout(api) -> None:
    board_id = _insert_board(api, slug="post-layout-update", board_type="post")

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"metadata": {LAYOUT_KEY: _layout()}},
        headers=api.headers["admin"],
    )

    _assert_invalid_layout(response)


def test_update_accepts_layout_when_final_board_type_is_activity_certification(api) -> None:
    board_id = _insert_board(api, slug="post-promoted-to-activity", board_type="post")
    metadata = {"legacy_setting": "keep", LAYOUT_KEY: _layout()}

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"board_type": "activity_certification", "metadata": metadata},
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    assert response.json()["data"]["board_type"] == "activity_certification"
    assert response.json()["data"]["metadata"] == metadata


def test_update_rejects_layout_retained_by_final_non_activity_board_type(api) -> None:
    metadata = {"legacy_setting": "keep", LAYOUT_KEY: _layout()}
    board_id = _insert_board(
        api,
        slug="activity-demoted-to-post",
        board_type="activity_certification",
        metadata=deepcopy(metadata),
    )

    response = api.client.put(
        f"/api/boards/admin/{board_id}",
        json={"board_type": "post"},
        headers=api.headers["admin"],
    )

    _assert_invalid_layout(response)
    with api.session() as db:
        board = db.get(Board, board_id)
        assert board.board_type == "activity_certification"
        assert board.metadata_json == metadata
