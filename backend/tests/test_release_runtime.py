import asyncio
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, func, select, update
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.requests import Request

import app.main as main_module
from app.admin_bootstrap import promote_initial_admin
from app.config import Settings, settings
from app.database import Base
from app.models.audit import OperationalAuditLog
from app.models.banner import Banner
from app.models.board import Board
from app.models.user import User
from app.rate_limit import _client_ip
from app.seed import seed_reference_data


PRODUCTION_MEDIA_ROOT = Path.cwd().resolve() / ".test-production-media"
PRODUCTION_PUBLIC_MEDIA = PRODUCTION_MEDIA_ROOT / "public"
PRODUCTION_PRIVATE_MEDIA = PRODUCTION_MEDIA_ROOT / "private"


def production_settings(**overrides) -> Settings:
    values = {
        "app_environment": "production",
        "database_url": "postgresql+psycopg://aisw:strong-database-password@db:5432/aisw",
        "auth_secret_key": "a-production-secret-that-is-longer-than-32-characters",
        "account_deletion_receipt_retention_days": 30,
        "smtp_host": "smtp.mail-provider.net",
        "smtp_username": "mailer",
        "smtp_password": "mail-password",
        "smtp_from_email": "no-reply@aisw.sogang.ac.kr",
        "smtp_required": True,
        "expo_push_enabled": True,
        "rate_limit_enabled": True,
        "rate_limit_trust_proxy": True,
        "rate_limit_trusted_proxy_ips": "10.0.0.2/32",
        "media_upload_dir": PRODUCTION_PUBLIC_MEDIA,
        "media_private_upload_dir": PRODUCTION_PRIVATE_MEDIA,
        "support_email": "support@aisw.sogang.ac.kr",
        "public_api_url": "https://api.aisw.sogang.ac.kr/api",
        "support_url": "https://aisw.sogang.ac.kr/support",
        "privacy_policy_url": "https://aisw.sogang.ac.kr/privacy",
        "account_deletion_url": "https://aisw.sogang.ac.kr/account-deletion",
        "operations_alert_webhook_url": "https://alerts.aisw.sogang.ac.kr/hooks/operations",
        "allowed_hosts": "api.aisw.sogang.ac.kr",
        "cors_origin_regex": r"^https://aisw\.sogang\.ac\.kr$",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


@pytest.mark.parametrize("environment", ["development", "test"])
def test_local_runtime_environments_keep_development_defaults(environment: str) -> None:
    Settings(_env_file=None, app_environment=environment).validate_runtime()


def test_complete_production_runtime_is_accepted() -> None:
    production_settings().validate_runtime()


def test_deployed_runtime_rejects_demo_seed() -> None:
    with pytest.raises(RuntimeError, match="SEED_DEMO_DATA"):
        production_settings(seed_demo_data=True).validate_runtime()


def test_cloudflare_compose_ingress_with_exact_private_peer_is_accepted() -> None:
    production_settings(
        cloudflare_enabled=True,
        cloudflare_tunnel_subnet="10.0.0.0/28",
        cloudflare_tunnel_ip="10.0.0.2",
        rate_limit_trusted_proxy_ips="10.0.0.2/32",
    ).validate_runtime()


def test_complete_staging_runtime_uses_the_same_validation_gate() -> None:
    production_settings(app_environment="staging").validate_runtime()


def test_explicit_ip_authenticated_smtp_relay_is_accepted() -> None:
    production_settings(
        smtp_auth="none",
        smtp_username=None,
        smtp_password=None,
    ).validate_runtime()


def test_unknown_runtime_environment_cannot_bypass_deployment_validation() -> None:
    with pytest.raises(RuntimeError, match="APP_ENVIRONMENT"):
        Settings(_env_file=None, app_environment="remote-qa").validate_runtime()


@pytest.mark.parametrize(
    ("override", "message"),
    [
        ({"allowed_hosts": ""}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "*"}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "api.example.invalid"}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "localhost"}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "192.168.10.20"}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "backend"}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "https://api.aisw.sogang.ac.kr"}, "ALLOWED_HOSTS"),
        ({"allowed_hosts": "api.aisw.sogang.ac.kr:8000"}, "ALLOWED_HOSTS"),
        (
            {
                "allowed_hosts": "other.aisw.sogang.ac.kr",
                "public_api_url": "https://api.aisw.sogang.ac.kr/api",
            },
            "ALLOWED_HOSTS",
        ),
        ({"auth_secret_key": "too-short"}, "AUTH_SECRET_KEY"),
        ({"auth_secret_key": "replace-with-a-long-production-secret-value"}, "AUTH_SECRET_KEY"),
        ({"database_url": "sqlite:///app.db"}, "DATABASE_URL"),
        (
            {"database_url": "postgresql+psycopg://aisw:replace-with-password@db:5432/aisw"},
            "DATABASE_URL",
        ),
        (
            {"database_url": "postgresql+psycopg://postgres:postgres@db:5432/aisw"},
            "DATABASE_URL",
        ),
        ({"smtp_required": False}, "SMTP"),
        ({"smtp_password": None}, "SMTP_AUTH=password"),
        ({"smtp_username": "", "smtp_password": ""}, "SMTP_AUTH=password"),
        ({"smtp_username": "mailer", "smtp_password": ""}, "SMTP_AUTH=password"),
        ({"smtp_username": "mailer", "smtp_password": "   "}, "SMTP_AUTH=password"),
        (
            {
                "smtp_auth": "none",
                "smtp_username": "mailer",
                "smtp_password": "mail-password",
            },
            "SMTP_AUTH=none",
        ),
        ({"smtp_host": "replace-with-smtp-host"}, "SMTP_HOST"),
        ({"smtp_from_email": "no-reply@sogang-ai-sw.local"}, "SMTP_FROM_EMAIL"),
        ({"smtp_security": "plain"}, "SMTP_SECURITY"),
        (
            {
                "smtp_timeout_seconds": 15,
                "expo_public_auth_email_timeout_ms": 15_000,
            },
            "EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS",
        ),
        ({"cors_origin_regex": r"^https?://.*$"}, "CORS_ORIGIN_REGEX"),
        ({"rate_limit_enabled": False}, "RATE_LIMIT_ENABLED"),
        (
            {
                "rate_limit_trust_proxy": True,
                "rate_limit_trusted_proxy_ips": "",
            },
            "RATE_LIMIT_TRUSTED_PROXY_IPS",
        ),
        (
            {
                "rate_limit_trust_proxy": True,
                "rate_limit_trusted_proxy_ips": "0.0.0.0/0",
            },
            "RATE_LIMIT_TRUSTED_PROXY_IPS",
        ),
        (
            {
                "rate_limit_trust_proxy": True,
                "rate_limit_trusted_proxy_ips": "trusted-proxy",
            },
            "RATE_LIMIT_TRUSTED_PROXY_IPS",
        ),
        (
            {
                "rate_limit_trust_proxy": False,
                "rate_limit_trusted_proxy_ips": "127.0.0.1/32",
            },
            "RATE_LIMIT_TRUSTED_PROXY_IPS",
        ),
        (
            {
                "rate_limit_trust_proxy": False,
                "rate_limit_trusted_proxy_ips": "",
            },
            "RATE_LIMIT_TRUST_PROXY",
        ),
        (
            {
                "cloudflare_enabled": True,
                "cloudflare_tunnel_subnet": "10.0.0.0/28",
                "cloudflare_tunnel_ip": "10.0.0.3",
                "rate_limit_trusted_proxy_ips": "10.0.0.2/32",
            },
            "RATE_LIMIT_TRUSTED_PROXY_IPS",
        ),
        (
            {
                "cloudflare_enabled": True,
                "cloudflare_tunnel_subnet": "8.8.8.0/28",
                "cloudflare_tunnel_ip": "8.8.8.8",
                "rate_limit_trusted_proxy_ips": "8.8.8.8/32",
            },
            "CLOUDFLARE_TUNNEL_IP",
        ),
        (
            {
                "cloudflare_enabled": True,
                "cloudflare_tunnel_subnet": "10.0.0.0/28",
                "cloudflare_tunnel_ip": "10.0.0.2",
                "rate_limit_trusted_proxy_ips": "10.0.0.0/24",
            },
            "RATE_LIMIT_TRUSTED_PROXY_IPS",
        ),
        (
            {
                "cloudflare_enabled": True,
                "cloudflare_tunnel_subnet": "10.0.1.0/28",
                "cloudflare_tunnel_ip": "10.0.0.2",
                "rate_limit_trusted_proxy_ips": "10.0.0.2/32",
            },
            "CLOUDFLARE_TUNNEL_IP",
        ),
        (
            {
                "cloudflare_enabled": True,
                "cloudflare_tunnel_subnet": "10.0.0.0/30",
                "cloudflare_tunnel_ip": "10.0.0.2",
                "rate_limit_trusted_proxy_ips": "10.0.0.2/32",
            },
            "CLOUDFLARE_TUNNEL_SUBNET",
        ),
        ({"expo_push_enabled": False}, "EXPO_PUSH_ENABLED"),
        ({"account_deletion_receipt_retention_days": None}, "ACCOUNT_DELETION_RECEIPT_RETENTION_DAYS"),
        ({"media_upload_dir": Path("uploads")}, "MEDIA_UPLOAD_DIR"),
        (
            {"media_private_upload_dir": PRODUCTION_PUBLIC_MEDIA},
            "MEDIA_UPLOAD_DIR",
        ),
        ({"support_email": None}, "SUPPORT_EMAIL"),
        ({"support_email": "replace-with-support@example.invalid"}, "SUPPORT_EMAIL"),
        ({"public_api_url": "http://api.aisw.sogang.ac.kr/api"}, "PUBLIC_API_URL"),
        ({"public_api_url": "https://api.aisw.sogang.ac.kr"}, "PUBLIC_API_URL"),
        ({"public_api_url": "https://192.168.10.20/api"}, "PUBLIC_API_URL"),
        (
            {
                "public_api_url": "https://temporary.trycloudflare.com/api",
                "allowed_hosts": "temporary.trycloudflare.com",
            },
            "PUBLIC_API_URL",
        ),
        ({"support_url": "https://example.com/support"}, "SUPPORT_URL"),
        ({"privacy_policy_url": None}, "PRIVACY_POLICY_URL"),
        ({"account_deletion_url": "https://localhost/delete"}, "ACCOUNT_DELETION_URL"),
        ({"operations_alert_webhook_url": None}, "OPERATIONS_ALERT_WEBHOOK_URL"),
        (
            {"operations_alert_webhook_url": "http://alerts.aisw.sogang.ac.kr/hooks/operations"},
            "OPERATIONS_ALERT_WEBHOOK_URL",
        ),
    ],
)
def test_incomplete_production_runtime_is_rejected(override: dict, message: str) -> None:
    with pytest.raises(RuntimeError, match=message):
        production_settings(**override).validate_runtime()


def test_trusted_host_policy_accepts_only_configured_public_host() -> None:
    deployed_settings = production_settings()
    test_app = FastAPI()

    @test_app.get("/health")
    def health() -> dict:
        return {"ok": True}

    test_app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=deployed_settings.trusted_hosts(),
        www_redirect=False,
    )

    with TestClient(test_app) as client:
        assert client.get("/health", headers={"Host": "api.aisw.sogang.ac.kr"}).status_code == 200
        assert client.get("/health", headers={"Host": "other.aisw.sogang.ac.kr"}).status_code == 400
        assert client.get("/health", headers={"Host": "localhost"}).status_code == 400
        assert client.get("/health", headers={"Host": "127.0.0.1"}).status_code == 400


def test_main_registers_trusted_host_middleware() -> None:
    assert any(
        middleware.cls is TrustedHostMiddleware
        for middleware in main_module.app.user_middleware
    )


@pytest.mark.parametrize(
    ("environment", "seed_demo_data", "expected_seed"),
    [
        ("development", None, "demo"),
        ("test", None, "demo"),
        ("test", False, "reference"),
        ("staging", None, "reference"),
        ("production", None, "reference"),
    ],
)
def test_lifespan_seed_strategy_is_environment_scoped(
    monkeypatch: pytest.MonkeyPatch,
    environment: str,
    seed_demo_data: bool | None,
    expected_seed: str,
) -> None:
    calls: list[str] = []

    class FakeSession:
        closed = False

        def close(self) -> None:
            self.closed = True

    db = FakeSession()
    monkeypatch.setattr(settings, "app_environment", environment)
    monkeypatch.setattr(settings, "seed_demo_data", seed_demo_data)
    monkeypatch.setattr(Settings, "validate_runtime", lambda _settings: None)
    monkeypatch.setattr(main_module, "SessionLocal", lambda: db)
    monkeypatch.setattr(main_module, "seed_initial_data", lambda _db: calls.append("demo"))
    monkeypatch.setattr(main_module, "seed_reference_data", lambda _db: calls.append("reference"))
    monkeypatch.setattr(main_module.media, "migrate_private_files", lambda _db: None)
    monkeypatch.setattr(main_module, "purge_account_deletion_staging_files", lambda: None)
    monkeypatch.setattr(main_module, "purge_expired_account_deletion_receipts", lambda _db: 0)

    async def run_lifespan() -> None:
        async with main_module.lifespan(main_module.app):
            pass

    asyncio.run(run_lifespan())

    assert calls == [expected_seed]
    assert db.closed is True


def _request_with_forwarded_for(
    *,
    client_host: str,
    forwarded_for: str | None,
    connecting_ip: str | None = None,
) -> Request:
    headers = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode("ascii")))
    if connecting_ip is not None:
        headers.append((b"cf-connecting-ip", connecting_ip.encode("ascii")))
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/example",
            "headers": headers,
            "query_string": b"",
            "server": ("testserver", 80),
            "client": (client_host, 12345),
            "scheme": "http",
        }
    )


def test_rate_limit_uses_forwarded_ip_only_from_configured_ingress(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "rate_limit_trust_proxy", True)
    monkeypatch.setattr(settings, "rate_limit_trusted_proxy_ips", "10.0.0.0/8")

    trusted_chain = _request_with_forwarded_for(
        client_host="10.0.0.2",
        forwarded_for="1.1.1.1, 10.9.8.7",
    )
    spoofed_leftmost = _request_with_forwarded_for(
        client_host="10.0.0.2",
        forwarded_for="6.6.6.6, 8.8.8.8",
    )
    untrusted_peer = _request_with_forwarded_for(
        client_host="192.168.10.20",
        forwarded_for="1.1.1.1",
    )
    malformed_chain = _request_with_forwarded_for(
        client_host="10.0.0.2",
        forwarded_for="not-an-ip",
    )
    cloudflare_peer = _request_with_forwarded_for(
        client_host="10.0.0.2",
        forwarded_for="6.6.6.6, 8.8.8.8",
        connecting_ip="203.0.113.42",
    )
    untrusted_cloudflare_header = _request_with_forwarded_for(
        client_host="192.168.10.20",
        forwarded_for="1.1.1.1",
        connecting_ip="203.0.113.42",
    )

    assert _client_ip(trusted_chain) == "1.1.1.1"
    assert _client_ip(spoofed_leftmost) == "8.8.8.8"
    assert _client_ip(untrusted_peer) == "192.168.10.20"
    assert _client_ip(malformed_chain) == "10.0.0.2"
    assert _client_ip(cloudflare_peer) == "203.0.113.42"
    assert _client_ip(untrusted_cloudflare_header) == "192.168.10.20"


def test_readiness_endpoint_checks_database(api) -> None:
    response = api.client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "data": {"ok": True, "database": "ready"},
    }


def test_production_reference_seed_creates_no_demo_user_and_preserves_operator_content() -> None:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as db:
            db.add_all(
                [
                    Board(
                        name="운영자 편집 공지",
                        slug="all-notices",
                        category="notices",
                        board_type="notice",
                        description="운영 환경에서 덮어쓰면 안 됩니다.",
                        sort_order=999,
                        read_permission="user",
                        write_permission="admin",
                    ),
                    Board(
                        name="운영자 커스텀 게시판",
                        slug="operator-custom",
                        category="community",
                        board_type="post",
                        description="시드 목록에 없는 운영자 게시판입니다.",
                        sort_order=1000,
                        read_permission="user",
                        write_permission="user",
                    ),
                ]
            )
            db.commit()

            seed_reference_data(db)

            assert db.scalar(select(func.count()).select_from(User)) == 0
            assert db.scalar(select(Board).where(Board.slug == "all-notices")).name == "운영자 편집 공지"
            custom_board = db.scalar(select(Board).where(Board.slug == "operator-custom"))
            assert custom_board is not None
            assert custom_board.is_active is True
            graduation_board = db.scalar(select(Board).where(Board.slug == "graduation-thesis"))
            assert graduation_board is not None
            assert graduation_board.board_type == "resource"
            assert graduation_board.write_permission == "user"
            banner = db.scalar(select(Banner).where(Banner.placement == "home"))
            assert banner is not None
            assert banner.created_by is None
            assert banner.is_active is False
            assert banner.image_url is None
            assert banner.image_urls is None
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_initial_admin_bootstrap_is_one_time_and_audited(api) -> None:
    with api.session() as db:
        db.execute(update(User).values(role="user"))
        db.commit()

        promoted_user_id = promote_initial_admin(db, email="OWNER@SOGANG.AC.KR")

        assert promoted_user_id == 1
        assert db.get(User, promoted_user_id).role == "admin"
        audit = db.scalar(
            select(OperationalAuditLog).where(
                OperationalAuditLog.action == "admin.bootstrap.initial"
            )
        )
        assert audit is not None
        assert audit.actor_id is None
        assert audit.target_id == promoted_user_id
        assert audit.details is None

        with pytest.raises(RuntimeError, match="already exists"):
            promote_initial_admin(db, email="other@sogang.ac.kr")
