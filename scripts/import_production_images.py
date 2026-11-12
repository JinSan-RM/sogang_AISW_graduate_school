#!/usr/bin/env python3
"""Verify locally built images, load them, and pin the production image profile.

This command does not build, pull, migrate, restart, or deploy containers.
Run on the Docker host after an authenticated transfer of the release directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


SERVICE_KEYS = {
    "backend": "PRODUCTION_BACKEND_IMAGE",
    "notification-worker": "PRODUCTION_WORKER_IMAGE",
    "frontend-web": "PRODUCTION_FRONTEND_IMAGE",
}
IMAGE_ID = re.compile(r"sha256:[a-f0-9]{64}\Z")
REVISION = re.compile(r"[a-f0-9]{40}\Z")
IMAGE_TAG = re.compile(r"[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]+)?(?:/[a-z0-9]+(?:[._-][a-z0-9]+)*)*:[a-f0-9]{40}\Z")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_package(manifest_path: Path) -> tuple[dict, Path]:
    manifest_path = Path(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1:
        raise ValueError("Unsupported release schema_version")
    revision = manifest.get("revision", "")
    if not isinstance(revision, str) or not REVISION.fullmatch(revision):
        raise ValueError("Release revision must be a full Git SHA")
    if manifest.get("architecture") != "linux/amd64":
        raise ValueError("Release architecture must be linux/amd64")
    archive = manifest.get("archive", {})
    if not isinstance(archive, dict) or archive.get("filename") != "images.tar":
        raise ValueError("Archive filename must be images.tar inside the release directory")
    archive_path = manifest_path.parent / "images.tar"
    if archive_path.is_symlink() or not archive_path.is_file():
        raise ValueError("Archive must be a regular file in the release directory")
    if sha256(archive_path) != archive.get("sha256"):
        raise ValueError("Archive checksum does not match manifest")
    services = manifest.get("services", {})
    if not isinstance(services, dict) or not {"backend", "notification-worker"} <= services.keys() or services.keys() - SERVICE_KEYS.keys():
        raise ValueError("Release must include backend and notification-worker; only known services are allowed")
    tag_ids = {}
    for name, image in services.items():
        if not isinstance(image, dict) or not isinstance(image.get("image_id"), str) or not IMAGE_ID.fullmatch(image["image_id"]):
            raise ValueError(name + " must specify an immutable image_id")
        tag = image.get("image", "")
        if not isinstance(tag, str) or not IMAGE_TAG.fullmatch(tag) or not tag.endswith(":" + revision):
            raise ValueError(name + " image tag must end in the release revision")
        if tag in tag_ids and tag_ids[tag] != image["image_id"]:
            raise ValueError("Release has conflicting image IDs for one tag")
        tag_ids[tag] = image["image_id"]
    if services["backend"] != services["notification-worker"]:
        raise ValueError("Backend and notification worker must use the same release image")
    return manifest, archive_path


def run_checked(args: list[str]) -> str:
    result = subprocess.run(args, text=True, capture_output=True, check=False)
    if result.returncode:
        raise RuntimeError(" ".join(args[:2]) + " failed (exit " + str(result.returncode) + ")")
    return result.stdout.strip()


def read_profile(path: Path) -> dict[str, str]:
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or key not in SERVICE_KEYS.values() or not IMAGE_ID.fullmatch(value) or key in values:
            raise ValueError("Existing production image profile is invalid")
        values[key] = value
    return values


def import_release(manifest_path: Path, profile_path: Path, runner=run_checked) -> dict[str, str]:
    manifest, archive_path = validate_package(manifest_path)
    profile_path = Path(profile_path)
    profile = read_profile(profile_path)
    runner(["docker", "load", "--input", str(archive_path)])
    verified = set()
    for service, desired in manifest["services"].items():
        if desired["image"] not in verified:
            actual = json.loads(runner(["docker", "image", "inspect", "--format", "{{json .}}", desired["image"]]))
            if actual.get("Id") != desired["image_id"]:
                raise ValueError("Loaded image digest differs from manifest")
            if actual.get("Os") != "linux" or actual.get("Architecture") != "amd64":
                raise ValueError("Loaded image platform must be linux/amd64")
            labels = actual.get("Config", {}).get("Labels") or {}
            if labels.get("org.opencontainers.image.revision") != manifest["revision"]:
                raise ValueError("Loaded image revision label differs from manifest")
            verified.add(desired["image"])
        profile[SERVICE_KEYS[service]] = desired["image_id"]
    for service, variable in SERVICE_KEYS.items():
        if variable not in profile:
            current = runner(["docker", "inspect", "--format", "{{.Image}}", "aisw-production-" + service + "-1"]).strip()
            if not IMAGE_ID.fullmatch(current):
                raise ValueError("Cannot preserve current image for " + service)
            profile[variable] = current
    # Resolve every final ID before replacing the profile; no missing frontend
    # reference can strand the next production startup.
    for image in set(profile.values()):
        runner(["docker", "image", "inspect", "--format", "{{.Id}}", image])
    profile_path.parent.mkdir(parents=True, exist_ok=True)
    content = "# Locally built release " + manifest["revision"] + "\n"
    content += "".join(key + "=" + profile[key] + "\n" for key in SERVICE_KEYS.values())
    temporary = None
    owner = profile_path.stat() if profile_path.exists() else profile_path.parent.stat()
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=profile_path.parent, prefix=".production-images-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(content)
        os.chmod(temporary, 0o600)
        if os.name == "posix" and os.geteuid() == 0:
            os.chown(temporary, owner.st_uid, owner.st_gid)
        os.replace(temporary, profile_path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()
    return profile


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--profile", type=Path, default=Path(__file__).resolve().parents[1] / "deploy/production-images.env")
    parser.add_argument("--check-archive", action="store_true", help="Validate package only; do not contact Docker or write a profile")
    args = parser.parse_args()
    try:
        if args.check_archive:
            manifest, _ = validate_package(args.manifest)
            print("Verified archive for revision " + manifest["revision"])
        else:
            values = import_release(args.manifest, args.profile)
            print("Loaded and verified images; pinned profile: " + str(args.profile))
            for key, value in values.items():
                print(key + "=" + value)
    except (OSError, ValueError, RuntimeError) as error:
        parser.exit(1, "ERROR: " + str(error) + "\n")


if __name__ == "__main__":
    main()
