#!/usr/bin/env python3
"""Build committed Linux production images locally and export a verified handoff.

This helper reads no dotenv files and contacts no deployment server. Backend and
notification-worker share one image. Frontend builds accept only explicit public
JSON values; operator secrets belong exclusively in the server runtime.
"""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from urllib.parse import urlsplit


ARCHITECTURE = "linux/amd64"
PUBLIC_ARGUMENTS = {
    "PUBLIC_API_URL": "EXPO_PUBLIC_API_URL",
    "EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS": "EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS",
    "SUPPORT_URL": "EXPO_PUBLIC_SUPPORT_URL",
    "PRIVACY_POLICY_URL": "EXPO_PUBLIC_PRIVACY_POLICY_URL",
    "ACCOUNT_DELETION_URL": "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
    "SUPPORT_EMAIL": "EXPO_PUBLIC_SUPPORT_EMAIL",
    "PUBLIC_OPERATOR_NAME": "EXPO_PUBLIC_OPERATOR_NAME",
    "PRIVACY_POLICY_EFFECTIVE_DATE": "EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE",
    "PRIVACY_POLICY_VERSION": "EXPO_PUBLIC_PRIVACY_POLICY_VERSION",
}


def run_command(arguments: list[str], *, capture: bool = True) -> str:
    """Use native argument arrays and fail on every nonzero process exit."""
    try:
        result = subprocess.run(
            [str(argument) for argument in arguments], check=False,
            capture_output=capture, text=True, encoding="utf-8", errors="replace",
        )
    except FileNotFoundError as error:
        raise RuntimeError(f"Required executable is unavailable: {arguments[0]}") from error
    if result.returncode:
        # Do not echo argument values or captured output into exception reports.
        raise RuntimeError(f"{arguments[0]} failed with exit code {result.returncode}")
    return (result.stdout or "").strip()


def read_public_config(path: Path) -> dict[str, str]:
    try:
        values = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as error:
        raise ValueError("Cannot read public configuration JSON") from error
    if not isinstance(values, dict) or set(values) - set(PUBLIC_ARGUMENTS):
        raise ValueError("Public configuration must contain only the documented public keys")
    values.setdefault("EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS", "120000")
    if set(PUBLIC_ARGUMENTS) - set(values):
        raise ValueError("Public configuration is missing required public fields")
    for name, value in values.items():
        if (
            not isinstance(value, str) or not value.strip() or value != value.strip()
            or len(value) > 2048 or any(ord(character) < 32 or ord(character) == 127 for character in value)
        ):
            raise ValueError(f"Invalid public field: {name}")
    for name in ["PUBLIC_API_URL", "SUPPORT_URL", "PRIVACY_POLICY_URL", "ACCOUNT_DELETION_URL"]:
        try:
            url = urlsplit(values[name])
            valid = (
                url.scheme == "https" and bool(url.hostname) and not url.username
                and not url.password and not url.fragment
                and not any(character.isspace() for character in values[name])
            )
            _ = url.port
        except ValueError:
            valid = False
        if not valid:
            raise ValueError(f"Public URL must use HTTPS without embedded credentials: {name}")
    timeout = values["EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS"]
    if not re.fullmatch(r"[0-9]+", timeout) or not 1000 <= int(timeout) <= 600000:
        raise ValueError("Invalid public email timeout")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", values["SUPPORT_EMAIL"]):
        raise ValueError("Invalid public support email")
    try:
        date.fromisoformat(values["PRIVACY_POLICY_EFFECTIVE_DATE"])
    except ValueError as error:
        raise ValueError("Invalid public privacy policy effective date") from error
    return values


def clean_revision(repo: Path) -> str:
    root = Path(run_command(["git", "-C", str(repo), "rev-parse", "--show-toplevel"])).resolve()
    if root != repo:
        raise ValueError("--repo must identify the Git repository root")
    if run_command(["git", "-C", str(repo), "status", "--porcelain", "--untracked-files=no"]):
        raise ValueError("Commit or preserve all tracked source changes before building production images")
    revision = run_command(["git", "-C", str(repo), "rev-parse", "HEAD"])
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Production builds require a full 40-character Git revision")
    return revision


def create_source_snapshot(repo: Path, revision: str, destination: Path, *, include_frontend: bool = True) -> None:
    """Extract only committed service trees, with no working-directory content."""
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Source snapshot requires a full 40-character Git revision")
    destination.mkdir(mode=0o700)
    with tempfile.TemporaryDirectory(prefix=".git-archive-", dir=destination.parent) as temporary:
        archive_path = Path(temporary) / "source.tar"
        paths = ["backend", "frontend"] if include_frontend else ["backend"]
        run_command(["git", "-C", str(repo), "archive", "--format=tar", "--output", str(archive_path), revision, "--", *paths])
        with tarfile.open(archive_path, "r") as archive:
            for member in archive:
                relative = PurePosixPath(member.name)
                if (
                    relative.is_absolute() or ".." in relative.parts
                    or "\\" in member.name or ":" in member.name
                    or not (member.isdir() or member.isfile())
                ):
                    raise ValueError("Git snapshot contains an unsupported or unsafe path")
                target = destination.joinpath(*relative.parts)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
                target.chmod(member.mode & 0o777)


def inspect_image(image: str, revision: str) -> dict[str, str]:
    try:
        info = json.loads(run_command(["docker", "image", "inspect", "--format", "{{json .}}", image]))
        image_id = info["Id"]
        labels = info.get("Config", {}).get("Labels") or {}
        valid = (
            info["Os"] == "linux" and info["Architecture"] == "amd64"
            and labels.get("org.opencontainers.image.revision") == revision
            and re.fullmatch(r"sha256:[0-9a-f]{64}", image_id)
        )
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        raise ValueError("Docker image inspection returned invalid metadata") from error
    if not valid:
        raise ValueError("Built image architecture, revision label or image ID does not match the requested build")
    return {"image": image, "image_id": image_id}


def build_images(
    repo: Path, output_dir: Path, *, services: str = "backend",
    public_config: Path | None = None, image_prefix: str = "aisw-campus",
) -> dict:
    repo, output_dir = Path(repo).resolve(), Path(output_dir).resolve()
    if services not in {"backend", "all"}:
        raise ValueError("Services must be backend or all")
    if not re.fullmatch(r"[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]+)?(?:/[a-z0-9]+(?:[._-][a-z0-9]+)*)*", image_prefix):
        raise ValueError("Invalid Docker image prefix")
    revision = clean_revision(repo)
    if services == "all" and public_config is None:
        raise ValueError("--services all requires --public-config JSON")
    # Validate any supplied JSON even for a backend-only build; never silently
    # accept an operator's private environment export as a public profile.
    public_values = read_public_config(public_config) if public_config is not None else {}
    if output_dir.exists():
        raise ValueError("Output directory must be new; preserve existing build artifacts")
    if run_command(["docker", "info", "--format", "{{.OSType}}"]) != "linux":
        raise ValueError("Docker must use Linux containers")
    output_dir.mkdir(mode=0o700, parents=True)
    built_services = {}
    images = []
    with tempfile.TemporaryDirectory(prefix=".build-source-", dir=output_dir) as temporary:
        snapshot = Path(temporary) / "source"
        create_source_snapshot(repo, revision, snapshot, include_frontend=services == "all")
        for service in (["backend", "frontend-web"] if services == "all" else ["backend"]):
            context = snapshot / ("backend" if service == "backend" else "frontend")
            dockerfile = context / ("Dockerfile" if service == "backend" else "Dockerfile.web")
            image = f"{image_prefix}-{service}:{revision}"
            arguments = [
                "docker", "buildx", "build", "--platform", ARCHITECTURE,
                "--load", "--pull", "--label", f"org.opencontainers.image.revision={revision}",
                "--tag", image, "--file", str(dockerfile),
            ]
            if service == "frontend-web":
                for name, argument in PUBLIC_ARGUMENTS.items():
                    arguments.extend(["--build-arg", f"{argument}={public_values[name]}"])
            arguments.append(str(context))
            print(f"Building {service} from {revision} for {ARCHITECTURE}", flush=True)
            run_command(arguments, capture=False)
            built_services[service] = inspect_image(image, revision)
            images.append(image)
    built_services["notification-worker"] = dict(built_services["backend"])
    pending_archive = output_dir / "images.tar.tmp"
    run_command(["docker", "image", "save", "--output", str(pending_archive), *images], capture=False)
    if not pending_archive.is_file() or pending_archive.stat().st_size == 0:
        raise ValueError("Docker did not export a nonempty image archive")
    digest = hashlib.sha256()
    with pending_archive.open("rb") as archive:
        for chunk in iter(lambda: archive.read(1024 * 1024), b""):
            digest.update(chunk)
    pending_archive.replace(output_dir / "images.tar")
    checksum = digest.hexdigest()
    (output_dir / "images.tar.sha256").write_text(f"{checksum}  images.tar\n", encoding="ascii", newline="\n")
    manifest = {
        "schema_version": 1, "revision": revision, "architecture": ARCHITECTURE,
        "archive": {"filename": "images.tar", "sha256": checksum}, "services": built_services,
    }
    pending_manifest = output_dir / "manifest.json.tmp"
    pending_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    pending_manifest.replace(output_dir / "manifest.json")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output-dir", type=Path, required=True, help="New private build artifact directory")
    parser.add_argument("--services", choices=["backend", "all"], default="backend")
    parser.add_argument("--public-config", type=Path, help="Strictly whitelisted public frontend JSON; required for all")
    parser.add_argument("--image-prefix", default="aisw-campus")
    arguments = parser.parse_args()
    try:
        manifest = build_images(arguments.repo, arguments.output_dir, services=arguments.services,
                                public_config=arguments.public_config, image_prefix=arguments.image_prefix)
    except (OSError, ValueError, RuntimeError, tarfile.TarError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        return 1
    print(f"Exported {manifest['revision']} to {arguments.output_dir.resolve() / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
