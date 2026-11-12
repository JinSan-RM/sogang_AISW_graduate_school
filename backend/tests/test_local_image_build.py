from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

import pytest


ROOT = Path(__file__).resolve().parents[2]


def build_module():
    path = ROOT / "scripts/build_production_images.py"
    assert path.is_file(), "Missing local production image build helper"
    spec = importlib.util.spec_from_file_location("build_production_images", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git(repo, *arguments):
    return subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=True, capture_output=True, text=True, encoding="utf-8",
    ).stdout.strip()


@pytest.fixture
def source_repo(tmp_path):
    repo = tmp_path / "repository"
    repo.mkdir()
    git(repo, "init")
    git(repo, "config", "user.name", "Build Test")
    git(repo, "config", "user.email", "build@example.test")
    (repo / ".gitignore").write_text(".env*\n", encoding="utf-8")
    for directory in ["backend", "frontend"]:
        (repo / directory).mkdir()
    (repo / "backend/Dockerfile").write_text("FROM scratch\n", encoding="utf-8")
    (repo / "backend/app.py").write_text("REVISION = 'committed'\n", encoding="utf-8")
    (repo / "frontend/Dockerfile.web").write_text("FROM scratch\n", encoding="utf-8")
    git(repo, "add", ".")
    git(repo, "commit", "-m", "Build fixture")
    (repo / "backend/.env.production").write_text("AUTH_SECRET_KEY=private\n", encoding="utf-8")
    (repo / "backend/untracked.txt").write_text("private untracked content", encoding="utf-8")
    return repo


def public_config():
    return {
        "PUBLIC_API_URL": "https://www.example.test/api",
        "SUPPORT_URL": "https://www.example.test/support",
        "PRIVACY_POLICY_URL": "https://www.example.test/privacy",
        "ACCOUNT_DELETION_URL": "https://www.example.test/account-deletion",
        "SUPPORT_EMAIL": "support@example.test",
        "PUBLIC_OPERATOR_NAME": "Campus $(this-is-literal); & council",
        "PRIVACY_POLICY_EFFECTIVE_DATE": "2026-11-12",
        "PRIVACY_POLICY_VERSION": "1.0",
    }


def test_snapshot_uses_committed_tree_and_excludes_private_untracked_files(source_repo, tmp_path):
    module = build_module()
    revision = git(source_repo, "rev-parse", "HEAD")
    destination = tmp_path / "snapshot"
    module.create_source_snapshot(source_repo, revision, destination)
    assert (destination / "backend/app.py").read_text() == "REVISION = 'committed'\n"
    assert not (destination / "backend/.env.production").exists()
    assert not (destination / "backend/untracked.txt").exists()
    assert not (destination / ".git").exists()


@pytest.mark.parametrize("staged", [False, True])
def test_dirty_tracked_source_stops_before_creating_artifacts(source_repo, tmp_path, staged):
    module = build_module()
    (source_repo / "backend/app.py").write_text("REVISION = 'dirty'\n", encoding="utf-8")
    if staged:
        git(source_repo, "add", "backend/app.py")
    output = tmp_path / "artifacts"
    with pytest.raises(ValueError, match="tracked"):
        module.build_images(source_repo, output, services="backend")
    assert not output.exists()


@pytest.mark.parametrize("private_key", ["DATABASE_URL", "AUTH_SECRET_KEY", "SMTP_PASSWORD"])
def test_public_config_rejects_unknown_private_keys_without_echoing_values(tmp_path, private_key):
    module = build_module()
    config = public_config() | {private_key: "never-echo-this-secret"}
    path = tmp_path / "public.json"
    path.write_text(json.dumps(config), encoding="utf-8")
    with pytest.raises(ValueError) as error:
        module.read_public_config(path)
    assert "never-echo-this-secret" not in str(error.value)


@pytest.mark.parametrize("override", [
    {"PUBLIC_API_URL": "https://name:password@example.test/api"},
    {"PUBLIC_API_URL": "http://example.test/api"},
    {"SUPPORT_URL": "https://example.test/\nSMTP_PASSWORD=private"},
    {"PUBLIC_OPERATOR_NAME": 4},
    {"EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS": "not-a-number"},
])
def test_public_config_rejects_nonpublic_or_malformed_values(tmp_path, override):
    module = build_module()
    path = tmp_path / "public.json"
    path.write_text(json.dumps(public_config() | override), encoding="utf-8")
    with pytest.raises(ValueError):
        module.read_public_config(path)


class DockerFixture:
    """Replace only the external Docker daemon; Git and filesystem remain real."""

    def __init__(self, module, revision, fail_save=False, incorrect_revision=False):
        self.real_run = module.run_command
        self.revision = revision
        self.fail_save = fail_save
        self.incorrect_revision = incorrect_revision
        self.commands = []
        self.contexts = []

    def __call__(self, arguments, **kwargs):
        if arguments[0] != "docker":
            return self.real_run(arguments, **kwargs)
        self.commands.append(arguments)
        if arguments[1:2] == ["info"]:
            return "linux"
        if arguments[1:3] == ["buildx", "build"]:
            context = Path(arguments[-1])
            self.contexts.append({str(p.relative_to(context)) for p in context.rglob("*") if p.is_file()})
            return ""
        if arguments[1:3] == ["image", "inspect"]:
            image = arguments[-1]
            return json.dumps({
                "Id": "sha256:" + ("b" if "backend" in image else "f") * 64,
                "Architecture": "amd64", "Os": "linux",
                "Config": {"Labels": {"org.opencontainers.image.revision":
                    "0" * 40 if self.incorrect_revision else self.revision}},
            })
        if arguments[1:3] == ["image", "save"]:
            if self.fail_save:
                raise RuntimeError("Docker save failed with exit code 23")
            archive = Path(arguments[arguments.index("--output") + 1])
            with tarfile.open(archive, "w") as output:
                output.addfile(tarfile.TarInfo("manifest.json"))
            return ""
        raise AssertionError(f"Unexpected Docker operation: {arguments}")


def test_backend_artifact_contract_reuses_one_revision_image_for_worker(source_repo, tmp_path, monkeypatch):
    module = build_module()
    revision = git(source_repo, "rev-parse", "HEAD")
    docker = DockerFixture(module, revision)
    monkeypatch.setattr(module, "run_command", docker)
    output = tmp_path / "artifacts"
    result = module.build_images(source_repo, output, services="backend")
    manifest = json.loads((output / "manifest.json").read_text())
    expected_image = {"image": f"aisw-campus-backend:{revision}", "image_id": "sha256:" + "b" * 64}
    assert result == manifest
    assert manifest["schema_version"] == 1
    assert manifest["revision"] == revision
    assert manifest["architecture"] == "linux/amd64"
    assert manifest["services"] == {"backend": expected_image, "notification-worker": expected_image}
    digest = hashlib.sha256((output / "images.tar").read_bytes()).hexdigest()
    assert manifest["archive"] == {"filename": "images.tar", "sha256": digest}
    assert (output / "images.tar.sha256").read_text() == f"{digest}  images.tar\n"
    build = [c for c in docker.commands if c[1:3] == ["buildx", "build"]]
    assert len(build) == 1
    assert build[0][build[0].index("--platform") + 1] == "linux/amd64"
    assert f"org.opencontainers.image.revision={revision}" in build[0]
    assert "--load" in build[0]
    assert "--build-arg" not in build[0]
    assert docker.contexts == [{"Dockerfile", "app.py"}]
    assert {p.name for p in output.iterdir()} == {"manifest.json", "images.tar", "images.tar.sha256"}


def test_all_build_maps_only_whitelisted_config_to_literal_frontend_arguments(source_repo, tmp_path, monkeypatch):
    module = build_module()
    revision = git(source_repo, "rev-parse", "HEAD")
    docker = DockerFixture(module, revision)
    monkeypatch.setattr(module, "run_command", docker)
    config_path = tmp_path / "public.json"
    config_path.write_text(json.dumps(public_config()), encoding="utf-8")
    manifest = module.build_images(source_repo, tmp_path / "all-artifacts", services="all", public_config=config_path)
    assert set(manifest["services"]) == {"backend", "notification-worker", "frontend-web"}
    builds = [c for c in docker.commands if c[1:3] == ["buildx", "build"]]
    frontend = builds[1]
    actual_args = {frontend[i + 1] for i, arg in enumerate(frontend) if arg == "--build-arg"}
    assert actual_args == {
        "EXPO_PUBLIC_API_URL=https://www.example.test/api",
        "EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS=120000",
        "EXPO_PUBLIC_SUPPORT_URL=https://www.example.test/support",
        "EXPO_PUBLIC_PRIVACY_POLICY_URL=https://www.example.test/privacy",
        "EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://www.example.test/account-deletion",
        "EXPO_PUBLIC_SUPPORT_EMAIL=support@example.test",
        "EXPO_PUBLIC_OPERATOR_NAME=Campus $(this-is-literal); & council",
        "EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE=2026-11-12",
        "EXPO_PUBLIC_PRIVACY_POLICY_VERSION=1.0",
    }
    save = [c for c in docker.commands if c[1:3] == ["image", "save"]][0]
    assert save[-2:] == [f"aisw-campus-backend:{revision}", f"aisw-campus-frontend-web:{revision}"]


def test_all_build_requires_public_config_before_creating_output(source_repo, tmp_path):
    module = build_module()
    output = tmp_path / "artifacts"
    with pytest.raises(ValueError, match="public"):
        module.build_images(source_repo, output, services="all")
    assert not output.exists()


def test_existing_artifact_directory_is_preserved(source_repo, tmp_path):
    module = build_module()
    output = tmp_path / "artifacts"
    output.mkdir()
    marker = output / "manifest.json"
    marker.write_text("preserve previous build", encoding="utf-8")
    with pytest.raises(ValueError, match="new"):
        module.build_images(source_repo, output, services="backend")
    assert marker.read_text() == "preserve previous build"


def test_native_command_failure_is_not_treated_as_success():
    import sys

    module = build_module()
    with pytest.raises(RuntimeError, match="exit code 23") as error:
        module.run_command([sys.executable, "-c", "import sys; print('not-for-exception'); sys.exit(23)"])
    assert "not-for-exception" not in str(error.value)


@pytest.mark.parametrize("failure", ["save", "revision"])
def test_failed_save_or_wrong_image_revision_never_publishes_manifest(source_repo, tmp_path, monkeypatch, failure):
    module = build_module()
    revision = git(source_repo, "rev-parse", "HEAD")
    docker = DockerFixture(module, revision, fail_save=failure == "save", incorrect_revision=failure == "revision")
    monkeypatch.setattr(module, "run_command", docker)
    output = tmp_path / "artifacts"
    with pytest.raises((ValueError, RuntimeError)):
        module.build_images(source_repo, output, services="backend")
    assert not (output / "manifest.json").exists()


@pytest.mark.skipif(os.name != "nt", reason="Windows PowerShell launcher")
def test_powershell_launcher_propagates_native_python_failure(tmp_path):
    launcher = ROOT / "scripts/build-production-images.ps1"
    assert launcher.is_file(), "Missing PowerShell local build launcher"
    fake_python = tmp_path / "failed-python.cmd"
    fake_python.write_text("@exit /b 23\r\n", encoding="ascii")
    result = subprocess.run([
        shutil.which("powershell.exe"), "-NoProfile", "-ExecutionPolicy", "Bypass",
        "-File", str(launcher), "-OutputDir", str(tmp_path / "unused"),
        "-Python", str(fake_python),
    ], capture_output=True, text=True)
    assert result.returncode == 23
