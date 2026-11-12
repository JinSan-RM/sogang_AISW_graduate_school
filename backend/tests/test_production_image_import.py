from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path

import pytest


SCRIPT = Path(__file__).resolve().parents[2] / "scripts/import_production_images.py"
spec = importlib.util.spec_from_file_location("production_image_import", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

REVISION = "a" * 40
IMAGE_ID = "sha256:" + "b" * 64
OLD_FRONTEND = "sha256:" + "c" * 64


def artifact(tmp_path: Path) -> Path:
    archive = tmp_path / "images.tar"
    archive.write_bytes(b"test image archive")
    manifest = {
        "schema_version": 1,
        "revision": REVISION,
        "architecture": "linux/amd64",
        "archive": {"filename": "images.tar", "sha256": hashlib.sha256(archive.read_bytes()).hexdigest()},
        "services": {
            name: {"image": "aisw-campus-backend:" + REVISION, "image_id": IMAGE_ID}
            for name in ("backend", "notification-worker")
        },
    }
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(manifest), encoding="utf-8")
    return path


def test_checksum_failure_never_loads_or_replaces_profile(tmp_path: Path) -> None:
    path = artifact(tmp_path)
    (tmp_path / "images.tar").write_bytes(b"corrupt archive")
    profile = tmp_path / "production-images.env"
    profile.write_text("original profile")
    calls = []
    with pytest.raises(ValueError, match="checksum"):
        module.import_release(path, profile, runner=lambda args: calls.append(args))
    assert calls == []
    assert profile.read_text() == "original profile"


@pytest.mark.parametrize("filename", ["../images.tar", "/tmp/images.tar"])
def test_manifest_cannot_select_an_archive_outside_package(tmp_path: Path, filename: str) -> None:
    path = artifact(tmp_path)
    manifest = json.loads(path.read_text())
    manifest["archive"]["filename"] = filename
    path.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="filename"):
        module.validate_package(path)


def test_backend_import_preserves_frontend_and_pins_verified_image_ids(tmp_path: Path) -> None:
    path = artifact(tmp_path)
    profile = tmp_path / "production-images.env"
    calls = []

    def runner(args: list[str]) -> str:
        calls.append(args)
        if args[1] == "load":
            return "Loaded"
        if args[1:3] == ["image", "inspect"]:
            return json.dumps({"Id": IMAGE_ID, "Os": "linux", "Architecture": "amd64", "Config": {"Labels": {"org.opencontainers.image.revision": REVISION}}})
        if args[1] == "inspect":
            return OLD_FRONTEND if "frontend-web" in args[-1] else IMAGE_ID
        raise AssertionError(args)

    result = module.import_release(path, profile, runner=runner)
    assert result == {"PRODUCTION_BACKEND_IMAGE": IMAGE_ID, "PRODUCTION_WORKER_IMAGE": IMAGE_ID, "PRODUCTION_FRONTEND_IMAGE": OLD_FRONTEND}
    assert "PRODUCTION_FRONTEND_IMAGE=" + OLD_FRONTEND in profile.read_text()
    assert all("build" not in args and "pull" not in args for args in calls)


@pytest.mark.parametrize("field,value", [("Architecture", "arm64"), ("Id", "sha256:" + "d" * 64)])
def test_loaded_wrong_platform_or_digest_cannot_replace_profile(tmp_path: Path, field: str, value: str) -> None:
    path = artifact(tmp_path)
    profile = tmp_path / "production-images.env"
    original = "".join(key + "=" + OLD_FRONTEND + "\n" for key in module.SERVICE_KEYS.values())
    profile.write_text(original)
    calls = []

    def runner(args: list[str]) -> str:
        calls.append(args)
        image = {"Id": IMAGE_ID, "Os": "linux", "Architecture": "amd64", "Config": {"Labels": {"org.opencontainers.image.revision": REVISION}}}
        image[field] = value
        return "Loaded" if args[1] == "load" else json.dumps(image)

    with pytest.raises(ValueError):
        module.import_release(path, profile, runner=runner)
    assert profile.read_text() == original
    assert calls[0][1] == "load"
    assert calls[1][1:3] == ["image", "inspect"]


def test_conflicting_ids_for_one_tag_are_rejected_before_loading(tmp_path: Path) -> None:
    path = artifact(tmp_path)
    manifest = json.loads(path.read_text())
    manifest["services"]["frontend-web"] = dict(manifest["services"]["backend"], image_id=OLD_FRONTEND)
    path.write_text(json.dumps(manifest))
    calls = []
    with pytest.raises(ValueError, match="conflicting"):
        module.import_release(path, tmp_path / "production-images.env", runner=lambda args: calls.append(args))
    assert calls == []


def test_package_accepts_builder_registry_port_prefix(tmp_path: Path) -> None:
    path = artifact(tmp_path)
    manifest = json.loads(path.read_text())
    for image in manifest["services"].values():
        image["image"] = "registry.example:5000/aisw-backend:" + REVISION
    path.write_text(json.dumps(manifest))
    verified, _ = module.validate_package(path)
    assert verified == manifest


def test_loaded_wrong_revision_cannot_replace_profile(tmp_path: Path) -> None:
    path = artifact(tmp_path)
    profile = tmp_path / "production-images.env"

    def runner(args: list[str]) -> str:
        return "Loaded" if args[1] == "load" else json.dumps({"Id": IMAGE_ID, "Os": "linux", "Architecture": "amd64", "Config": {"Labels": {"org.opencontainers.image.revision": "f" * 40}}})

    with pytest.raises(ValueError, match="revision"):
        module.import_release(path, profile, runner=runner)
    assert not profile.exists()
