from __future__ import annotations

from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest
from sqlalchemy.dialects import postgresql

from app import migrate
from app.config import settings
from app.main import app
from app.media_service import media_file_signature
from app.models.banner import Banner
from app.models.board import Board
from app.models.media import MediaAsset, PostAttachment
from app.models.user import User
from app.routers import media as media_router


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"test-image-body"
PDF_BYTES = b"%PDF-1.7\n% test document\n"


class FakeInspector:
    def __init__(self, schema_by_table: dict[str, dict]):
        self.schema_by_table = schema_by_table

    def get_table_names(self) -> list[str]:
        return list(self.schema_by_table)

    def get_columns(self, table_name: str) -> list[dict]:
        return self.schema_by_table[table_name]["columns"]

    def get_pk_constraint(self, table_name: str) -> dict:
        return self.schema_by_table[table_name]["primary_key"]

    def get_foreign_keys(self, table_name: str) -> list[dict]:
        return self.schema_by_table[table_name]["foreign_keys"]

    def get_unique_constraints(self, table_name: str) -> list[dict]:
        return self.schema_by_table[table_name]["unique_constraints"]


def _postgresql_type(column: migrate.ColumnSignature):
    if column.type_name == "integer":
        return postgresql.INTEGER()
    if column.type_name == "varchar":
        return postgresql.VARCHAR(length=column.length)
    if column.type_name == "text":
        return postgresql.TEXT()
    if column.type_name == "boolean":
        return postgresql.BOOLEAN()
    if column.type_name == "timestamp":
        return postgresql.TIMESTAMP(timezone=False)
    raise AssertionError(f"Missing reflected-type fixture for {column.type_name}")


def _postgresql_default(column: migrate.ColumnSignature) -> str | None:
    default = column.server_default
    if default is None:
        return None
    if default.startswith("sequence:"):
        sequence_name = default.removeprefix("sequence:")
        return f"""nextval('"public".{sequence_name}'::regclass)"""
    if default == "now":
        return "CURRENT_TIMESTAMP"
    if default.startswith("boolean:"):
        value = default.removeprefix("boolean:")
        return f"('{value}'::boolean)"
    if default.startswith("integer:"):
        value = default.removeprefix("integer:")
        return f"('{value}'::integer)"
    if default.startswith("string:"):
        value = default.removeprefix("string:").replace("'", "''")
        return f"'{value}'::character varying"
    raise AssertionError(f"Missing reflected-default fixture for {default}")


def _exact_phase1_reflection() -> dict[str, dict]:
    reflected: dict[str, dict] = {}
    for table_name, table in migrate.LEGACY_PHASE1_SIGNATURE.items():
        reflected[table_name] = {
            # Reflection order and generated constraint names are not stable.
            "columns": [
                {
                    "name": column_name,
                    "type": _postgresql_type(column),
                    "nullable": column.nullable,
                    "default": _postgresql_default(column),
                    "autoincrement": column.autoincrement,
                }
                for column_name, column in reversed(table.columns)
            ],
            "primary_key": {
                "name": f"{table_name}_pkey",
                "constrained_columns": list(table.primary_key),
            },
            "foreign_keys": [
                {
                    "name": f"{table_name}_{index}_fkey",
                    "constrained_columns": list(foreign_key.constrained_columns),
                    "referred_schema": "public",
                    "referred_table": foreign_key.referred_table,
                    "referred_columns": list(foreign_key.referred_columns),
                    "options": {"ondelete": foreign_key.ondelete or "NO ACTION"},
                }
                for index, foreign_key in enumerate(reversed(table.foreign_keys))
            ],
            "unique_constraints": [
                {
                    "name": f"{table_name}_{index}_key",
                    "column_names": list(columns),
                }
                for index, columns in enumerate(reversed(table.unique_constraints))
            ],
        }
    return reflected


def _reflected_column(schema: dict[str, dict], table_name: str, column_name: str) -> dict:
    return next(column for column in schema[table_name]["columns"] if column["name"] == column_name)


@pytest.fixture
def media_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[Path, Path]:
    public_directory = tmp_path / "public"
    private_directory = tmp_path / "private"
    monkeypatch.setattr(settings, "media_upload_dir", public_directory)
    monkeypatch.setattr(settings, "media_private_upload_dir", private_directory)
    monkeypatch.setattr(settings, "media_upload_max_bytes", 1024)
    monkeypatch.setattr(settings, "media_upload_chunk_bytes", 4096)
    monkeypatch.setattr(settings, "media_access_url_expire_seconds", 60)
    monkeypatch.setattr(media_router, "enforce_rate_limit", lambda *_args, **_kwargs: None)
    return public_directory, private_directory


def _upload(
    api,
    *,
    actor: str = "owner",
    filename: str = "photo.png",
    body: bytes = PNG_BYTES,
    content_type: str = "image/png",
    private: bool = False,
):
    return api.client.post(
        "/api/media/uploads",
        files={"file": (filename, body, content_type)},
        data={"private": str(private).lower()},
        headers=api.headers[actor],
    )


def _signed_file_response(api, access_response):
    signed_url = access_response.json()["data"]["url"]
    return api.client.get(signed_url)


def test_upload_stream_validation_and_cleanup(api, media_storage, monkeypatch: pytest.MonkeyPatch) -> None:
    public_directory, _ = media_storage

    empty = _upload(api, body=b"")
    assert empty.status_code == 400
    assert empty.json()["code"] == "EMPTY_FILE"
    assert list(public_directory.glob("*")) == []

    extension_mismatch = _upload(api, filename="photo.jpg", content_type="image/png")
    assert extension_mismatch.status_code == 415
    assert extension_mismatch.json()["code"] == "MEDIA_TYPE_MISMATCH"
    assert list(public_directory.glob("*")) == []

    content_mismatch = _upload(api, body=PDF_BYTES)
    assert content_mismatch.status_code == 415
    assert content_mismatch.json()["code"] == "MEDIA_TYPE_MISMATCH"
    assert list(public_directory.glob("*")) == []

    unsupported = _upload(api, filename="payload.exe", body=b"MZ", content_type="application/octet-stream")
    assert unsupported.status_code == 415
    assert unsupported.json()["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert list(public_directory.glob("*")) == []

    monkeypatch.setattr(settings, "media_upload_max_bytes", 8)
    too_large = _upload(api)
    assert too_large.status_code == 413
    assert too_large.json()["code"] == "FILE_TOO_LARGE"
    assert list(public_directory.glob("*")) == []


def test_upload_returns_stable_reference_and_signed_file_needs_no_bearer(api, media_storage) -> None:
    public_directory, _ = media_storage
    uploaded = _upload(api)
    assert uploaded.status_code == 200
    payload = uploaded.json()["data"]
    assert payload["url"] == f"/api/media/{payload['id']}/access-url"
    assert payload["access_url"] == payload["url"]
    assert "signature=" not in payload["url"]
    assert len(list(public_directory.glob("*.png"))) == 1
    assert list(public_directory.glob("*.uploading")) == []
    with api.session() as db:
        stored_media = db.get(MediaAsset, payload["id"])
        assert stored_media.url == payload["url"]
        assert "signature=" not in stored_media.url
        expired_signature = media_file_signature(stored_media, 0)

    no_bearer = api.client.get(payload["access_url"])
    assert no_bearer.status_code == 401
    assert no_bearer.json()["code"] == "UNAUTHORIZED"
    assert not any(getattr(route, "path", None) == "/uploads" for route in app.routes)
    legacy_direct = api.client.get(f"/uploads/{payload['stored_filename']}")
    assert legacy_direct.status_code == 404
    assert legacy_direct.json()["code"] == "NOT_FOUND"

    owner_access = api.client.get(payload["access_url"], headers=api.headers["owner"])
    assert owner_access.status_code == 200
    file_response = _signed_file_response(api, owner_access)
    assert file_response.status_code == 200
    assert file_response.content == PNG_BYTES
    assert file_response.headers["x-content-type-options"] == "nosniff"

    signed_url = owner_access.json()["data"]["url"]
    parsed = urlsplit(signed_url)
    query = parse_qs(parsed.query)
    invalid_signature = "0" * 64
    denied = api.client.get(
        parsed.path,
        params={"expires": query["expires"][0], "signature": invalid_signature},
    )
    assert denied.status_code == 403
    expired = api.client.get(
        parsed.path,
        params={"expires": 0, "signature": expired_signature},
    )
    assert expired.status_code == 403


def test_post_media_reuses_post_read_policy_and_any_readable_link_allows(api, media_storage) -> None:
    uploaded = _upload(api)
    media_id = uploaded.json()["data"]["id"]
    with api.session() as db:
        db.add_all(
            [
                PostAttachment(post_id=1, media_id=media_id, sort_order=0),
                PostAttachment(post_id=3, media_id=media_id, sort_order=0),
            ]
        )
        db.commit()

    access = api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers["other"])
    assert access.status_code == 200
    assert _signed_file_response(api, access).status_code == 200


def test_private_mutual_aid_media_is_hidden_from_non_owner(api, media_storage) -> None:
    _, private_directory = media_storage
    uploaded = _upload(api, filename="evidence.pdf", body=PDF_BYTES, content_type="application/pdf", private=True)
    assert uploaded.status_code == 200
    payload = uploaded.json()["data"]
    media_id = payload["id"]
    assert len(list(private_directory.glob("*.pdf"))) == 1

    with api.session() as db:
        db.add(PostAttachment(post_id=1, media_id=media_id, sort_order=0))
        db.commit()

    other_access = api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers["other"])
    assert other_access.status_code == 404
    assert other_access.json()["code"] == "NOT_FOUND"

    for actor in ("owner", "admin"):
        allowed = api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers[actor])
        assert allowed.status_code == 200
        assert _signed_file_response(api, allowed).content == PDF_BYTES


def test_profile_and_banner_references_are_member_readable_via_stable_and_legacy_paths(api, media_storage) -> None:
    profile_upload = _upload(api, filename="avatar.png")
    profile_payload = profile_upload.json()["data"]
    profile_id = profile_payload["id"]
    stable_reference = profile_payload["url"]

    saved_profile = api.client.put(
        "/api/users/me",
        json={"profile_image_url": stable_reference},
        headers=api.headers["owner"],
    )
    assert saved_profile.status_code == 200
    profile_response = api.client.get("/api/users/me", headers=api.headers["owner"])
    assert profile_response.json()["data"]["profile_image_url"] == stable_reference
    assert profile_response.json()["data"]["profile_image_media_id"] == profile_id

    stable_resolution = api.client.get(
        "/api/media/access-url",
        params={"path": stable_reference},
        headers=api.headers["other"],
    )
    assert stable_resolution.status_code == 200
    assert _signed_file_response(api, stable_resolution).status_code == 200

    with api.session() as db:
        profile_media = db.get(MediaAsset, profile_id)
        legacy_reference = f"/uploads/{profile_media.stored_filename}"
        owner = db.get(User, 1)
        owner.profile_image_url = legacy_reference
        db.commit()

    legacy_resolution = api.client.get(
        "/api/media/access-url",
        params={"path": legacy_reference},
        headers=api.headers["other"],
    )
    assert legacy_resolution.status_code == 200

    banner_upload = _upload(api, filename="banner.png")
    banner_payload = banner_upload.json()["data"]
    with api.session() as db:
        db.add(
            Banner(
                placement="home",
                image_url=banner_payload["url"],
                theme="blue",
                is_active=True,
                created_by=1,
            )
        )
        db.commit()

    banner_resolution = api.client.get(
        "/api/media/access-url",
        params={"path": banner_payload["url"]},
        headers=api.headers["other"],
    )
    assert banner_resolution.status_code == 200

    absolute_path = api.client.get(
        "/api/media/access-url",
        params={"path": "file:///etc/passwd"},
        headers=api.headers["owner"],
    )
    assert absolute_path.status_code == 422


def test_profile_image_update_canonicalizes_and_validates_media(api, media_storage) -> None:
    profile_upload = _upload(api, filename="avatar.png")
    profile_payload = profile_upload.json()["data"]
    with api.session() as db:
        profile_media = db.get(MediaAsset, profile_payload["id"])
        legacy_reference = f"/uploads/{profile_media.stored_filename}"

    legacy_update = api.client.put(
        "/api/users/me",
        json={"profile_image_url": legacy_reference},
        headers=api.headers["owner"],
    )
    assert legacy_update.status_code == 200
    profile = api.client.get("/api/users/me", headers=api.headers["owner"]).json()["data"]
    assert profile["profile_image_url"] == profile_payload["url"]
    assert profile["profile_image_media_id"] == profile_payload["id"]

    cleared = api.client.put(
        "/api/users/me",
        json={"profile_image_url": "   "},
        headers=api.headers["owner"],
    )
    assert cleared.status_code == 200
    cleared_profile = api.client.get("/api/users/me", headers=api.headers["owner"]).json()["data"]
    assert cleared_profile["profile_image_url"] is None
    assert cleared_profile["profile_image_media_id"] is None

    other_upload = _upload(api, actor="other", filename="other.png")
    private_upload = _upload(api, filename="private.png", private=True)
    document_upload = _upload(api, filename="profile.pdf", body=PDF_BYTES, content_type="application/pdf")
    invalid_references = [
        "https://example.com/avatar.png",
        other_upload.json()["data"]["url"],
        private_upload.json()["data"]["url"],
        document_upload.json()["data"]["url"],
        "/api/media/999999/access-url",
    ]
    for reference in invalid_references:
        response = api.client.put(
            "/api/users/me",
            json={"profile_image_url": reference},
            headers=api.headers["owner"],
        )
        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"


def test_active_readable_board_metadata_grants_member_media_access(api, media_storage) -> None:
    readable_upload = _upload(api, filename="leader.png")
    inactive_upload = _upload(api, filename="inactive.png")
    admin_only_upload = _upload(api, filename="admin-only.png")
    readable_reference = readable_upload.json()["data"]["url"]
    inactive_reference = inactive_upload.json()["data"]["url"]
    admin_only_reference = admin_only_upload.json()["data"]["url"]

    with api.session() as db:
        db.add_all(
            [
                Board(
                    id=10,
                    name="Cohort Leaders",
                    slug="cohort-leaders",
                    category="council",
                    board_type="organization_intro",
                    read_permission="user",
                    write_permission="admin",
                    metadata_json={
                        "cohort_leaders": [
                            {
                                "captain": {
                                    "profile": {
                                        "image_url": readable_reference,
                                    }
                                }
                            }
                        ]
                    },
                    is_active=True,
                ),
                Board(
                    id=11,
                    name="Inactive Leaders",
                    slug="inactive-leaders",
                    category="council",
                    board_type="organization_intro",
                    read_permission="user",
                    write_permission="admin",
                    metadata_json={"image_url": inactive_reference},
                    is_active=False,
                ),
                Board(
                    id=12,
                    name="Admin Files",
                    slug="admin-files",
                    category="council",
                    board_type="organization_intro",
                    read_permission="admin",
                    write_permission="admin",
                    metadata_json={"image_url": admin_only_reference},
                    is_active=True,
                ),
            ]
        )
        db.commit()

    readable = api.client.get(
        "/api/media/access-url",
        params={"path": readable_reference},
        headers=api.headers["other"],
    )
    assert readable.status_code == 200
    assert _signed_file_response(api, readable).status_code == 200

    inactive = api.client.get(
        "/api/media/access-url",
        params={"path": inactive_reference},
        headers=api.headers["other"],
    )
    assert inactive.status_code == 404
    admin_only = api.client.get(
        "/api/media/access-url",
        params={"path": admin_only_reference},
        headers=api.headers["other"],
    )
    assert admin_only.status_code == 404
    assert (
        api.client.get(
            "/api/media/access-url",
            params={"path": admin_only_reference},
            headers=api.headers["admin"],
        ).status_code
        == 200
    )


def test_unattached_media_is_owner_or_admin_only(api, media_storage) -> None:
    uploaded = _upload(api)
    media_id = uploaded.json()["data"]["id"]
    assert api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers["other"]).status_code == 404
    assert api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers["owner"]).status_code == 200
    assert api.client.get(f"/api/media/{media_id}/access-url", headers=api.headers["admin"]).status_code == 200


def test_migration_detection_handles_clean_versioned_and_exact_phase1() -> None:
    assert migrate.detect_unversioned_legacy_revision(FakeInspector({})) is None
    assert migrate.detect_unversioned_legacy_revision(FakeInspector({"alembic_version": {}})) is None
    exact_phase1 = _exact_phase1_reflection()
    assert migrate.detect_unversioned_legacy_revision(FakeInspector(exact_phase1)) == migrate.LEGACY_PHASE1_REVISION


def test_migration_runner_stamps_only_exact_legacy_then_upgrades(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, str]] = []
    monkeypatch.setattr(migrate.command, "stamp", lambda _config, revision: calls.append(("stamp", revision)))
    monkeypatch.setattr(migrate.command, "upgrade", lambda _config, revision: calls.append(("upgrade", revision)))
    exact_phase1 = _exact_phase1_reflection()

    migrate.run_migrations(inspector=FakeInspector(exact_phase1), config=object())
    assert calls == [("stamp", "0001_phase1_init"), ("upgrade", "head")]

    calls.clear()
    migrate.run_migrations(inspector=FakeInspector({}), config=object())
    assert calls == [("upgrade", "head")]


@pytest.mark.parametrize(
    "mismatch",
    [
        "column_name",
        "column_type",
        "column_length",
        "nullability",
        "sequence_default",
        "role_default",
        "boolean_default",
        "integer_default",
        "timestamp_default",
        "server_default_missing",
        "no_default_metadata_missing",
        "pk_autoincrement",
        "pk_autoincrement_missing",
        "primary_key",
        "foreign_key_ondelete",
        "unique_constraint",
    ],
)
def test_migration_detection_refuses_structural_mismatch_before_upgrade(
    monkeypatch: pytest.MonkeyPatch,
    mismatch: str,
) -> None:
    ambiguous = _exact_phase1_reflection()
    if mismatch == "column_name":
        ambiguous["users"]["columns"].append(
            {"name": "cohort", "type": postgresql.VARCHAR(length=20), "nullable": True}
        )
    elif mismatch == "column_type":
        _reflected_column(ambiguous, "users", "id")["type"] = postgresql.BIGINT()
    elif mismatch == "column_length":
        _reflected_column(ambiguous, "users", "username")["type"] = postgresql.VARCHAR(length=51)
    elif mismatch == "nullability":
        _reflected_column(ambiguous, "users", "username")["nullable"] = True
    elif mismatch == "sequence_default":
        _reflected_column(ambiguous, "users", "id")["default"] = "nextval('posts_id_seq'::regclass)"
    elif mismatch == "role_default":
        _reflected_column(ambiguous, "users", "role")["default"] = "'admin'::character varying"
    elif mismatch == "boolean_default":
        _reflected_column(ambiguous, "users", "is_active")["default"] = "false"
    elif mismatch == "integer_default":
        _reflected_column(ambiguous, "posts", "view_count")["default"] = "1"
    elif mismatch == "timestamp_default":
        _reflected_column(ambiguous, "users", "created_at")["default"] = "clock_timestamp()"
    elif mismatch == "server_default_missing":
        _reflected_column(ambiguous, "users", "role").pop("default")
    elif mismatch == "no_default_metadata_missing":
        _reflected_column(ambiguous, "users", "username").pop("default")
    elif mismatch == "pk_autoincrement":
        _reflected_column(ambiguous, "users", "id")["autoincrement"] = False
    elif mismatch == "pk_autoincrement_missing":
        _reflected_column(ambiguous, "users", "id").pop("autoincrement")
    elif mismatch == "primary_key":
        ambiguous["users"]["primary_key"]["constrained_columns"] = ["username"]
    elif mismatch == "foreign_key_ondelete":
        board_foreign_key = next(
            foreign_key
            for foreign_key in ambiguous["posts"]["foreign_keys"]
            if foreign_key["constrained_columns"] == ["board_id"]
        )
        board_foreign_key["options"]["ondelete"] = "CASCADE"
    elif mismatch == "unique_constraint":
        ambiguous["users"]["unique_constraints"] = [
            constraint
            for constraint in ambiguous["users"]["unique_constraints"]
            if constraint["column_names"] != ["username"]
        ]
    else:
        raise AssertionError(f"Unhandled mismatch fixture: {mismatch}")

    upgrade_called = False
    stamp_called = False

    def _upgrade(*_args, **_kwargs):
        nonlocal upgrade_called
        upgrade_called = True

    def _stamp(*_args, **_kwargs):
        nonlocal stamp_called
        stamp_called = True

    monkeypatch.setattr(migrate.command, "upgrade", _upgrade)
    monkeypatch.setattr(migrate.command, "stamp", _stamp)
    with pytest.raises(RuntimeError, match="Refusing to stamp an unversioned database"):
        migrate.run_migrations(inspector=FakeInspector(ambiguous), config=object())
    assert upgrade_called is False
    assert stamp_called is False
