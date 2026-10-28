from __future__ import annotations

import io
import asyncio
from threading import Event
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from PIL import Image
import pillow_heif
import pytest
from sqlalchemy import select

from app.config import settings
from app import media_previews
from app import media_service
from app.account_deletion import delete_user_account
from app.errors import AppException
from app.models.media import MediaAsset
from app.models.user import User
from app.routers import media as media_router
from starlette.datastructures import UploadFile


def heic_image(size=(48, 32), *, orientation=None) -> bytes:
    image = Image.new("RGB", size, (40, 130, 210))
    if orientation is not None:
        exif = Image.Exif()
        exif[274] = orientation
    encoded = io.BytesIO()
    kwargs = {"exif": exif.tobytes()} if orientation is not None else {}
    pillow_heif.from_pillow(image).save(encoded, quality=85, **kwargs)
    return encoded.getvalue()


@pytest.fixture
def preview_storage(tmp_path, monkeypatch):
    public = tmp_path / "public"
    private = tmp_path / "private"
    monkeypatch.setattr(settings, "media_upload_dir", public)
    monkeypatch.setattr(settings, "media_private_upload_dir", private)
    monkeypatch.setattr(settings, "media_upload_max_bytes", 10485760)
    monkeypatch.setattr(media_router, "enforce_rate_limit", lambda *args, **kwargs: None)
    return public, private


def upload(api, body, *, private=False, content_type="image/heic"):
    extension = "heif" if content_type == "image/heif" else "heic"
    response = api.client.post(
        "/api/media/uploads",
        files={"file": (f"photo.{extension}", body, content_type)},
        data={"private": str(private).lower()},
        headers=api.headers["owner"],
    )
    return response


def access_url(api, media_id, **params):
    response = api.client.get(
        f"/api/media/{media_id}/access-url",
        params=params,
        headers=api.headers["owner"],
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["url"]


def legacy_media(api, storage, body, *, private=False):
    directory = storage[1 if private else 0]
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "legacy.heic"
    path.write_bytes(body)
    with api.session() as db:
        owner = db.scalar(select(User).where(User.username == "owner"))
        media = MediaAsset(
            owner_id=owner.id, original_filename="legacy.heic",
            stored_filename=path.name, content_type="image/heic",
            file_size=len(body), is_private=private, status="ready",
        )
        db.add(media)
        db.flush()
        media_id = media.id
        db.commit()
    return media_id, path


@pytest.mark.parametrize("content_type", ["image/heic", "image/heif"])
def test_new_heic_display_is_jpeg_and_original_is_preserved(api, preview_storage, content_type):
    original = heic_image()
    response = upload(api, original, content_type=content_type)
    assert response.status_code == 200, response.text
    payload = response.json()["data"]
    assert payload["content_type"] == content_type
    assert (preview_storage[0] / payload["stored_filename"]).read_bytes() == original

    display_url = access_url(api, payload["id"])
    display = api.client.get(display_url)
    assert display.status_code == 200, display.text
    assert display.headers["content-type"] == "image/jpeg"
    assert ".jpg" in display.headers["content-disposition"]
    with Image.open(io.BytesIO(display.content)) as image:
        assert image.format == "JPEG"
        assert image.mode == "RGB"
        assert image.size == (48, 32)
        assert not image.getexif()

    original_url = access_url(api, payload["id"], original=True)
    downloaded_original = api.client.get(original_url)
    assert downloaded_original.headers["content-type"] == content_type
    assert downloaded_original.content == original
    assert display_url != original_url


def test_legacy_heic_is_converted_lazily_and_cached(api, preview_storage):
    original = heic_image()
    media_id, path = legacy_media(api, preview_storage, original)
    url = access_url(api, media_id)
    assert list(path.parent.iterdir()) == [path]
    first = api.client.get(url)
    assert first.status_code == 200
    assert first.headers["content-type"] == "image/jpeg"
    assert path.read_bytes() == original
    copies = [file for file in path.parent.iterdir() if file != path]
    assert len(copies) == 1
    modified = copies[0].stat().st_mtime_ns
    second = api.client.get(url)
    assert second.content == first.content
    assert copies[0].stat().st_mtime_ns == modified


def test_preview_signature_cannot_be_used_for_original_or_other_media(api, preview_storage):
    media_id, path = legacy_media(api, preview_storage, heic_image())
    url = access_url(api, media_id)
    parsed = urlsplit(url)
    query = parse_qs(parsed.query)
    original = api.client.get(f"/api/media/files/{media_id}", params=query)
    assert original.status_code == 403
    tampered = api.client.get(url.replace(f"/{media_id}?", f"/{media_id + 1}?"))
    assert tampered.status_code == 403
    expired_query = {key: values[0] for key, values in query.items()}
    expired_query["expires"] = "1"
    assert api.client.get(parsed.path, params=expired_query).status_code == 403
    assert list(path.parent.iterdir()) == [path]


def test_private_preview_keeps_authorization_and_no_store(api, preview_storage):
    media_id, path = legacy_media(api, preview_storage, heic_image(), private=True)
    assert api.client.get(f"/api/media/{media_id}/access-url").status_code == 401
    assert api.client.get(
        f"/api/media/{media_id}/access-url", headers=api.headers["other"]
    ).status_code == 404
    response = api.client.get(access_url(api, media_id))
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, no-store"
    assert not preview_storage[0].exists()
    assert path.read_bytes()


def test_corrupt_heic_upload_is_rejected_without_partial_files(api, preview_storage):
    response = upload(api, b"\x00\x00\x00\x18ftypheic" + b"invalid")
    assert response.status_code == 415
    assert response.json()["code"] == "MEDIA_CONVERSION_FAILED"
    assert not list(preview_storage[0].iterdir())


def test_preview_rotates_and_bounds_image_without_exif(api, preview_storage):
    response = upload(api, heic_image((4096, 64), orientation=6))
    assert response.status_code == 200, response.text
    display = api.client.get(access_url(api, response.json()["data"]["id"]))
    assert display.status_code == 200
    with Image.open(io.BytesIO(display.content)) as image:
        assert image.size == (32, 2048)
        assert not image.getexif()


def test_legacy_conversion_is_atomic_under_concurrent_requests(tmp_path):
    path = tmp_path / "original.heic"
    original = heic_image()
    path.write_bytes(original)
    with ThreadPoolExecutor(max_workers=6) as pool:
        copies = list(pool.map(lambda _: media_previews.ensure_jpeg_preview(path).read_bytes(), range(12)))
    assert all(copy == copies[0] for copy in copies)
    assert path.read_bytes() == original
    assert sorted(p.name for p in tmp_path.iterdir()) == [
        "original.heic", "original.heic.display-v1.jpg",
    ]
    with Image.open(io.BytesIO(copies[0])) as image:
        assert image.format == "JPEG"


def test_pixel_limit_rejects_upload_without_publishing_sidecar(api, preview_storage, monkeypatch):
    monkeypatch.setattr(media_previews, "MAX_SOURCE_PIXELS", 1000)
    response = upload(api, heic_image((48, 32)))
    assert response.status_code == 415
    assert response.json()["code"] == "MEDIA_CONVERSION_FAILED"
    assert not list(preview_storage[0].iterdir())


def test_legacy_conversion_failure_preserves_original_and_cleans_partial_copy(tmp_path, monkeypatch):
    path = tmp_path / "original.heic"
    original = heic_image()
    path.write_bytes(original)

    def fail_save(self, target, *args, **kwargs):
        Path(target).write_bytes(b"partial")
        raise OSError("simulated encoder failure")

    monkeypatch.setattr(Image.Image, "save", fail_save)
    with pytest.raises(AppException) as failure:
        media_previews.ensure_jpeg_preview(path)
    assert failure.value.code == "MEDIA_CONVERSION_FAILED"
    assert path.read_bytes() == original
    assert list(tmp_path.iterdir()) == [path]


@pytest.mark.parametrize("rollback", [False, True])
def test_account_deletion_handles_original_and_private_preview(api, preview_storage, monkeypatch, rollback):
    original = heic_image()
    response = upload(api, original, private=True)
    assert response.status_code == 200
    payload = response.json()["data"]
    source = preview_storage[1] / payload["stored_filename"]
    copy = media_previews.preview_path(source)
    assert copy.is_file()
    jpeg = copy.read_bytes()
    with api.session() as db:
        owner = db.scalar(select(User).where(User.username == "owner"))
        if rollback:
            def fail_commit():
                raise RuntimeError("simulated commit failure")
            monkeypatch.setattr(db, "commit", fail_commit)
            with pytest.raises(RuntimeError, match="simulated commit failure"):
                delete_user_account(db, user_id=owner.id, current_password="TestPassword1!")
        else:
            delete_user_account(db, user_id=owner.id, current_password="TestPassword1!")
    if rollback:
        assert source.read_bytes() == original
        assert copy.read_bytes() == jpeg
    else:
        assert not source.exists()
        assert not copy.exists()
    assert not list(preview_storage[1].glob(".*.account-delete"))


def test_upload_conversion_allows_other_async_requests_to_progress(preview_storage, monkeypatch):
    tick = Event()
    conversion_started = Event()
    observed = []

    def busy_conversion(source):
        conversion_started.set()
        observed.append(tick.wait(timeout=0.2))
        return media_previews.preview_path(source)

    async def other_request():
        while not conversion_started.is_set():
            await asyncio.sleep(0.001)
        tick.set()

    async def run_requests():
        file = UploadFile(io.BytesIO(heic_image()), filename="photo.heic")
        # UploadFile derives content type from headers, as actual multipart input does.
        from starlette.datastructures import Headers
        file.headers = Headers({"content-type": "image/heic"})
        await asyncio.gather(media_service.store_upload(file, private=False), other_request())

    monkeypatch.setattr(media_service, "ensure_jpeg_preview", busy_conversion)
    asyncio.run(run_requests())
    assert observed == [True]


def test_conversion_cannot_publish_after_account_deletion(tmp_path, monkeypatch):
    from app.account_deletion import _stage_files, _finalize_staged_files

    source = tmp_path / "private.heic"
    source.write_bytes(heic_image())
    media = MediaAsset(stored_filename=source.name, content_type="image/heic", is_private=True)
    monkeypatch.setattr(settings, "media_private_upload_dir", tmp_path)
    monkeypatch.setattr(settings, "media_upload_dir", tmp_path / "public")
    original_replace = media_previews.os.replace

    def delete_before_publication(start, target):
        if Path(target) == media_previews.preview_path(source):
            _finalize_staged_files(_stage_files([media]))
        return original_replace(start, target)

    monkeypatch.setattr(media_previews.os, "replace", delete_before_publication)
    with pytest.raises(AppException) as failure:
        media_previews.ensure_jpeg_preview(source)
    assert failure.value.code == "NOT_FOUND"
    assert not list(tmp_path.iterdir())
