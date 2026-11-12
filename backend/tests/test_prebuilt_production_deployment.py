from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[2]
BASH = shutil.which("bash") if os.name != "nt" else "C:/Program Files/Git/bin/bash.exe"
IMAGE_KEYS = (
    "PRODUCTION_BACKEND_IMAGE",
    "PRODUCTION_WORKER_IMAGE",
    "PRODUCTION_FRONTEND_IMAGE",
)
IMAGE_IDS = tuple("sha256:" + digit * 64 for digit in "123")


@pytest.fixture
def deployment(tmp_path):
    repo = tmp_path / "repository"
    (repo / "scripts").mkdir(parents=True)
    (repo / "deploy").mkdir()
    for name in ("production-compose.sh", "production-compose.ps1", "production-ip.sh", "production-domain.sh", "production-import-legacy.sh", "production-images.sh", "configure_public_domain.py"):
        source = ROOT / "scripts" / name
        if source.exists():
            shutil.copy(source, repo / "scripts" / name)
    for source in ROOT.glob("docker-compose*.yml"):
        shutil.copy(source, repo / source.name)
    shutil.copy(ROOT / "deploy/public-domain.env", repo / "deploy/public-domain.env")
    production = (ROOT / ".env.production.example").read_text(encoding="utf-8")
    production = production.replace("replace-with-monitored-address@example.invalid", "operator@example.com")
    (repo / ".env.production").write_text(production, encoding="utf-8")
    shutil.copy(ROOT / ".env.production.worker.example", repo / ".env.production.worker")
    (repo / "deploy/production-images.env").write_text(
        "\n".join(f"{key}={value}" for key, value in zip(IMAGE_KEYS, IMAGE_IDS)) + "\n",
        encoding="utf-8",
    )
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    docker = fake_bin / "docker"
    docker.write_text(
        """#!/usr/bin/env bash
printf 'docker' >> "$COMMAND_LOG"
printf '\\t%s' "$@" >> "$COMMAND_LOG"
printf '\\n' >> "$COMMAND_LOG"
printf 'images\\t%s\\t%s\\t%s\\n' "${PRODUCTION_BACKEND_IMAGE-}" "${PRODUCTION_WORKER_IMAGE-}" "${PRODUCTION_FRONTEND_IMAGE-}" >> "$COMMAND_LOG"
if [[ "$1 $2" == 'image inspect' && "${MISSING_IMAGE:-}" == "${@: -1}" ]]; then exit 1; fi
if [[ " $* " == *' config --images '* ]]; then
  printf '%s\\n' "${PRODUCTION_BACKEND_IMAGE:-aisw-production-backend:latest}" "${PRODUCTION_WORKER_IMAGE:-aisw-production-notification-worker:latest}" "${PRODUCTION_FRONTEND_IMAGE:-aisw-production-frontend-web:latest}" postgres:16
fi
""",
        encoding="utf-8",
    )
    docker.chmod(0o755)
    for name, body in (
        ("curl", "exit 0\n"),
        ("openssl", "printf 'IP Address:34.50.35.119\\n'\n"),
    ):
        executable = fake_bin / name
        executable.write_text("#!/usr/bin/env bash\n" + body, encoding="utf-8")
        executable.chmod(0o755)
    environment = os.environ.copy()
    for key in (*IMAGE_KEYS, "PRODUCTION_IMAGES_ENV_FILE", "PUBLIC_DOMAIN_ENABLED", "CLOUDFLARE_ENABLED"):
        environment.pop(key, None)
    environment["PATH"] = str(fake_bin) + os.pathsep + environment["PATH"]
    environment["COMMAND_LOG"] = str(tmp_path / "commands.log")
    return repo, environment


def bash_run(deployment, entrypoint, action, **overrides):
    if not Path(BASH).is_file() and not shutil.which(BASH):
        pytest.skip("Bash is unavailable")
    repo, environment = deployment
    result = subprocess.run(
        [BASH, str(repo / "scripts" / entrypoint), action],
        cwd=repo,
        env={**environment, **overrides},
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
        check=False,
    )
    log = Path(environment["COMMAND_LOG"])
    calls = [line.split("\t")[1:] for line in log.read_text().splitlines() if line.startswith("docker\t")] if log.exists() else []
    return result, calls, log.read_text() if log.exists() else ""


def test_production_compose_accepts_immutable_imported_image_ids():
    services = yaml.safe_load((ROOT / "docker-compose.production.example.yml").read_text(encoding="utf-8"))["services"]
    for service, key, fallback in (
        ("backend", IMAGE_KEYS[0], "aisw-production-backend:latest"),
        ("notification-worker", IMAGE_KEYS[1], "aisw-production-notification-worker:latest"),
        ("frontend-web", IMAGE_KEYS[2], "aisw-production-frontend-web:latest"),
    ):
        assert services[service].get("image") == f"${{{key}:-{fallback}}}"


@pytest.mark.parametrize("entrypoint", ["production-compose.sh", "production-ip.sh"])
def test_config_uses_imported_images_without_build_or_pull(deployment, entrypoint):
    result, calls, log = bash_run(deployment, entrypoint, "Config")
    assert result.returncode == 0, result.stderr
    assert "images\t" + "\t".join(IMAGE_IDS) in log
    assert not any("build" in call or "pull" in call or "--build" in call for call in calls)
    if entrypoint == "production-ip.sh":
        [runtime] = [call for call in calls if "run" in call]
        assert "--build" not in runtime
        assert runtime[runtime.index("--pull") + 1] == "never"


@pytest.mark.parametrize("entrypoint", ["production-compose.sh", "production-ip.sh"])
def test_up_requires_all_images_before_stopping_ingress(deployment, entrypoint):
    result, calls, _ = bash_run(deployment, entrypoint, "Up", MISSING_IMAGE=IMAGE_IDS[1])
    assert result.returncode != 0
    assert "not available locally" in result.stderr
    assert not any("stop" in call or "up" in call or "run" in call for call in calls)


@pytest.mark.parametrize("entrypoint", ["production-compose.sh", "production-ip.sh"])
def test_up_never_builds_or_pulls(deployment, entrypoint):
    result, calls, _ = bash_run(deployment, entrypoint, "Up")
    assert result.returncode == 0, result.stderr
    starts = [call for call in calls if "up" in call]
    assert starts
    for call in starts:
        assert "--no-build" in call and "--build" not in call
        assert call[call.index("--pull") + 1] == "never"
    assert not any("build" in call or "pull" in call for call in calls)


def test_image_profile_never_executes_shell_and_environment_override_wins(deployment):
    repo, _ = deployment
    marker = repo / "executed"
    profile = repo / "deploy/production-images.env"
    profile.write_text(f"PRODUCTION_BACKEND_IMAGE=$(touch {marker.as_posix()})\n", encoding="utf-8")
    result, calls, _ = bash_run(deployment, "production-compose.sh", "Config")
    assert result.returncode != 0
    assert not marker.exists()
    assert not calls
    profile.write_text("PRODUCTION_BACKEND_IMAGE=" + IMAGE_IDS[0] + "\n", encoding="utf-8")
    result, _, log = bash_run(deployment, "production-compose.sh", "Config", PRODUCTION_BACKEND_IMAGE="example/backend:reviewed")
    assert result.returncode == 0, result.stderr
    assert "images\texample/backend:reviewed\t" in log


def test_missing_backend_image_blocks_runtime_configuration_validation(deployment):
    result, calls, _ = bash_run(deployment, "production-ip.sh", "Config", MISSING_IMAGE=IMAGE_IDS[0])
    assert result.returncode != 0
    assert "not available locally" in result.stderr
    assert not any("run" in call or "build" in call for call in calls)


def test_missing_optional_profile_preserves_existing_image_tags(deployment):
    repo, _ = deployment
    (repo / "deploy/production-images.env").unlink()
    result, calls, _ = bash_run(deployment, "production-compose.sh", "Up")
    assert result.returncode == 0, result.stderr
    inspected = [call[-1] for call in calls if call[:2] == ["image", "inspect"]]
    assert inspected == ["aisw-production-backend:latest", "aisw-production-notification-worker:latest", "aisw-production-frontend-web:latest", "postgres:16"]


@pytest.mark.parametrize("profile", ["DATABASE_URL=private-value\n", "PRODUCTION_BACKEND_IMAGE=sha256:bad\n", "PRODUCTION_BACKEND_IMAGE=\n"])
def test_invalid_image_profile_fails_before_any_docker_command(deployment, profile):
    repo, _ = deployment
    (repo / "deploy/production-images.env").write_text(profile, encoding="utf-8")
    result, calls, _ = bash_run(deployment, "production-compose.sh", "Config")
    assert result.returncode != 0
    assert not calls
    assert "private-value" not in result.stderr


@pytest.mark.parametrize("entrypoint", ["production-compose.sh", "production-ip.sh", "production-domain.sh"])
def test_build_action_is_rejected_without_runtime_changes(deployment, entrypoint):
    result, calls, _ = bash_run(deployment, entrypoint, "Build")
    assert result.returncode != 0
    assert "local" in result.stderr.lower() and "build" in result.stderr.lower()
    assert not calls


def powershell_run(deployment, action, **overrides):
    executable = shutil.which("pwsh") or shutil.which("powershell")
    if executable is None:
        pytest.skip("PowerShell is unavailable")
    repo, environment = deployment
    wrapper = repo / "invoke.ps1"
    wrapper.write_text(
        """function docker {
    $call = @{ arguments = @($args); images = @($env:PRODUCTION_BACKEND_IMAGE, $env:PRODUCTION_WORKER_IMAGE, $env:PRODUCTION_FRONTEND_IMAGE) }
    Add-Content -LiteralPath $env:COMMAND_LOG -Value ($call | ConvertTo-Json -Compress)
    $global:LASTEXITCODE = 0
    if ($args[0] -eq 'image' -and $args[1] -eq 'inspect' -and $env:MISSING_IMAGE -eq $args[-1]) { $global:LASTEXITCODE = 1; return }
    if (($args -join ' ') -match 'config --images') { $env:PRODUCTION_BACKEND_IMAGE; $env:PRODUCTION_WORKER_IMAGE; $env:PRODUCTION_FRONTEND_IMAGE; 'postgres:16' }
}
& "$PSScriptRoot/scripts/production-compose.ps1" -Action $env:TEST_ACTION
""",
        encoding="utf-8",
    )
    result = subprocess.run([executable, "-NoProfile", "-File", str(wrapper)], cwd=repo, env={**environment, "TEST_ACTION": action, **overrides}, capture_output=True, text=True, encoding="utf-8", timeout=30, check=False)
    log = Path(environment["COMMAND_LOG"])
    calls = [json.loads(line) for line in log.read_text(encoding="utf-8-sig").splitlines()] if log.exists() else []
    return result, calls


def test_powershell_up_loads_profile_and_forbids_builds_and_pulls(deployment):
    result, calls = powershell_run(deployment, "Up")
    assert result.returncode == 0, result.stderr
    assert calls and calls[0]["images"] == list(IMAGE_IDS)
    starts = [call["arguments"] for call in calls if "up" in call["arguments"]]
    assert starts
    for call in starts:
        assert "--no-build" in call and "--build" not in call
        assert call[call.index("--pull") + 1] == "never"


def test_powershell_missing_image_does_not_stop_ingress(deployment):
    result, calls = powershell_run(deployment, "Up", MISSING_IMAGE=IMAGE_IDS[1])
    assert result.returncode != 0
    assert "not available locally" in result.stderr
    assert not any("up" in call["arguments"] or "stop" in call["arguments"] for call in calls)


def test_powershell_rejects_untrusted_profile_without_printing_values(deployment):
    repo, _ = deployment
    (repo / "deploy/production-images.env").write_text("DATABASE_URL=private-value\n", encoding="utf-8")
    result, calls = powershell_run(deployment, "Config")
    assert result.returncode != 0
    assert "unsupported key" in result.stderr
    assert "private-value" not in result.stderr
    assert not calls


def test_powershell_rejects_production_build_action(deployment):
    result, calls = powershell_run(deployment, "Build")
    assert result.returncode != 0
    assert "local build" in result.stderr
    assert not calls


def test_legacy_import_checks_local_images_before_processing_sources(deployment):
    result, calls, _ = bash_run(deployment, "production-import-legacy.sh", "/missing-source", MISSING_IMAGE=IMAGE_IDS[0])
    assert result.returncode != 0
    assert "not available locally" in result.stderr
    assert any(call[:2] == ["image", "inspect"] for call in calls)
    assert not any("up" in call or "run" in call or "exec" in call for call in calls)
