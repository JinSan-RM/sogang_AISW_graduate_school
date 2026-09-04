from __future__ import annotations

from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]


def _read(relative_path: str) -> str:
    path = REPO_ROOT / relative_path
    assert path.is_file(), f"Missing production deployment file: {relative_path}"
    return path.read_text(encoding="utf-8")


def _compose(relative_path: str) -> dict:
    return yaml.safe_load(_read(relative_path))


def test_ip_overlay_exposes_only_nginx_and_uses_exact_proxy_peer() -> None:
    overlay = _compose("docker-compose.ip.yml")
    services = overlay["services"]
    nginx = services["nginx"]

    assert nginx["ports"] == ["80:80", "443:443"]
    assert nginx["networks"]["ip_ingress"]["ipv4_address"] == (
        "${IP_INGRESS_PROXY_IP:-172.30.251.14}"
    )
    assert "ip_public" in nginx["networks"]
    assert overlay["networks"]["ip_ingress"]["internal"] is True
    assert overlay["networks"]["ip_public"]["driver"] == "bridge"
    assert overlay["networks"]["ip_public"].get("internal") is not True
    assert "ip_ingress" in services["backend"]["networks"]
    assert "ip_ingress" in services["frontend-web"]["networks"]
    assert "ip_public" not in services["backend"]["networks"]
    assert "ip_public" not in services["frontend-web"]["networks"]

    for compose_file in ("docker-compose.yml", "docker-compose.production.example.yml"):
        compose = _compose(compose_file)
        assert "ports" not in compose.get("services", {}).get("db", {})

    production = _compose("docker-compose.production.example.yml")
    assert production["services"]["backend"]["ports"] == [
        "127.0.0.1:${BACKEND_BIND_PORT:-8000}:8000"
    ]
    assert production["services"]["frontend-web"]["ports"] == [
        "127.0.0.1:${FRONTEND_BIND_PORT:-8080}:8080"
    ]


def test_nginx_uses_official_entrypoint_and_starts_certificate_watcher() -> None:
    overlay = _compose("docker-compose.ip.yml")
    nginx = overlay["services"]["nginx"]
    starter = _read("deploy/nginx/40-start-certificate-watch.sh")

    assert "command" not in nginx
    assert (
        "./deploy/nginx/40-start-certificate-watch.sh:"
        "/docker-entrypoint.d/40-start-certificate-watch.sh:ro"
    ) in nginx["volumes"]
    assert (
        "./deploy/nginx/watch-certificates.sh:"
        "/usr/local/bin/watch-certificates.sh:ro"
    ) in nginx["volumes"]
    assert starter.splitlines() == [
        "#!/bin/sh",
        "set -eu",
        "sh /usr/local/bin/watch-certificates.sh &",
    ]


def test_ip_overlay_pins_tls_images_and_separates_staging_state() -> None:
    overlay = _compose("docker-compose.ip.yml")
    services = overlay["services"]

    assert services["nginx"]["image"] == (
        "nginx:1.31.3-alpine@sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752"
    )
    assert services["certbot"]["image"] == (
        "certbot/certbot:v5.7.0@sha256:34ee91d2f43008eb78a007d22f23ed4b2eaa9a454cb27ca2c042b49527a695b4"
    )
    assert "letsencrypt_staging" in overlay["volumes"]
    assert "letsencrypt" in overlay["volumes"]
    assert overlay["volumes"]["letsencrypt_staging"] != overlay["volumes"]["letsencrypt"]


def test_nginx_contract_preserves_acme_and_proxies_api_over_https() -> None:
    bootstrap = _read("deploy/nginx/ip-bootstrap.conf.template")
    https = _read("deploy/nginx/ip.conf.template")
    watcher = _read("deploy/nginx/watch-certificates.sh")

    assert "location ^~ /.well-known/acme-challenge/" in bootstrap
    assert "return 404" in bootstrap
    assert "listen 443 ssl" in https
    assert "/etc/letsencrypt/live/${PUBLIC_IP}/fullchain.pem" in https
    assert "location /api/" in https
    assert "proxy_pass http://backend:8000" in https
    assert "proxy_pass http://frontend-web:8080" in https
    assert "proxy_set_header X-Forwarded-For $remote_addr" in https
    assert "proxy_set_header X-Forwarded-Proto https" in https
    assert "client_max_body_size 11m;" in https
    assert "sha256sum" in watcher
    assert "nginx -s reload" in watcher


def test_ip_lifecycle_script_uses_short_lived_ip_certificate_and_smoke_gate() -> None:
    script = _read("scripts/production-ip.sh")

    for action in ("Config", "IssueStaging", "Issue", "Up", "Renew", "Ps", "Logs", "Smoke"):
        assert f"{action})" in script
    assert "--preferred-profile shortlived" in script
    assert "--ip-address" in script
    assert "--webroot-path" in script
    assert "CLOUDFLARE_ENABLED must be false" in script
    assert "RATE_LIMIT_TRUSTED_PROXY_IPS" in script
    assert "settings.validate_runtime()" in script
    assert "DATABASE_URL" in script
    assert "OPERATIONS_ALERT_WEBHOOK_URL" in script
    assert 'Production and worker $shared_key values must match.' in script
    assert "openssl s_client" in script
    assert "curl --fail" in script


def test_legacy_import_script_enforces_review_database_and_fresh_targets() -> None:
    script = _read("scripts/production-import-legacy.sh")

    assert script.splitlines()[2] == "umask 077"
    assert "board_articles_ver3.xlsx" in script
    assert "attachments_ver2/attachments" in script
    assert "migration_review" in script
    assert "verify_legacy_media.py" in script
    assert "--expected-manifest-sha256" in script
    assert "pg_dump" in script
    assert "pg_restore" in script
    assert "Refusing to overwrite" in script
    assert "648" in script
    assert 'scripts/production-ip.sh" Config' in script
    assert '[[ "$post_count" == 685 ]]' in script
    assert '[[ "$comment_count" == 247 ]]' in script
    assert '[[ "$user_count" == 196 ]]' in script
    assert '[[ "$legacy_user_count" == 196 ]]' in script
    assert '[[ "$admin_user_count" == 0 ]]' in script
    assert '[[ "$active_user_count" == 0 ]]' in script
    assert '[[ "$ownerless_media_count" == 25 ]]' in script
    assert '[[ "$posts_without_author" == 0 ]]' in script
    assert '[[ "$comments_without_author" == 0 ]]' in script
    assert '[[ "$ledger_count" == 1923 ]]' in script

    first_empty_volume_check = script.index('ensure_empty_volume "$production_media_volume"')
    production_restore = script.index('pg_restore --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"')
    assert first_empty_volume_check < production_restore


def test_production_example_documents_ip_ingress_inputs() -> None:
    example = _read(".env.production.example")

    assert "PUBLIC_IP=34.50.35.119" in example
    assert "TLS_CONTACT_EMAIL=" in example
    assert "IP_INGRESS_SUBNET=172.30.251.0/28" in example
    assert "IP_INGRESS_PROXY_IP=172.30.251.14" in example
    assert "RATE_LIMIT_TRUSTED_PROXY_IPS=172.30.251.14/32" in example
    assert "ALLOWED_HOSTS=34.50.35.119" in example
    assert "PUBLIC_API_URL=https://34.50.35.119/api" in example
    assert "SUPPORT_URL=https://34.50.35.119/legal/support" in example
    assert "PRIVACY_POLICY_URL=https://34.50.35.119/legal/privacy" in example
    assert (
        "ACCOUNT_DELETION_URL=https://34.50.35.119/legal/account-deletion" in example
    )

    lifecycle = _read("scripts/production-ip.sh")
    assert '"https://$public_ip/legal/support"' in lifecycle
    assert '"https://$public_ip/legal/privacy"' in lifecycle
    assert '"https://$public_ip/legal/account-deletion"' in lifecycle
    assert "/legal/privacy" in lifecycle
