import ssl
from email.utils import parsedate_to_datetime

import pytest

from app import email as email_module
from app.config import settings


class FakeSMTP:
    def __init__(
        self,
        host: str,
        port: int,
        *,
        timeout: int,
        context: ssl.SSLContext | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.timeout = timeout
        self.constructor_context = context
        self.ehlo_count = 0
        self.starttls_context: ssl.SSLContext | None = None
        self.login_credentials: tuple[str, str] | None = None
        self.sent_messages = []
        self.sent_envelopes: list[tuple[str | None, list[str] | None]] = []
        self.noop_count = 0
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _traceback) -> None:
        self.closed = True

    def ehlo(self) -> None:
        self.ehlo_count += 1

    def starttls(self, *, context: ssl.SSLContext) -> None:
        self.starttls_context = context

    def login(self, username: str, password: str) -> None:
        self.login_credentials = (username, password)

    def send_message(
        self,
        message,
        from_addr: str | None = None,
        to_addrs: list[str] | None = None,
    ) -> None:
        self.sent_messages.append(message)
        self.sent_envelopes.append((from_addr, to_addrs))

    def noop(self) -> tuple[int, bytes]:
        self.noop_count += 1
        return 250, b"OK"

    def close(self) -> None:
        self.closed = True


@pytest.fixture
def smtp_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_host", "smtp.provider.net")
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_username", "mailer")
    monkeypatch.setattr(settings, "smtp_password", "secret")
    monkeypatch.setattr(settings, "smtp_auth", "password")
    monkeypatch.setattr(settings, "smtp_from_email", "no-reply@sogang.ac.kr")
    monkeypatch.setattr(settings, "smtp_from_name", "서강 AI-SW 대학원 커뮤니티")
    monkeypatch.setattr(settings, "smtp_reply_to", "A72040@sogang.ac.kr")
    monkeypatch.setattr(settings, "smtp_required", True)
    monkeypatch.setattr(settings, "smtp_timeout_seconds", 12)


def test_starttls_delivery_uses_verified_tls_and_configured_timeout(
    monkeypatch: pytest.MonkeyPatch,
    smtp_settings: None,
) -> None:
    connections: list[FakeSMTP] = []

    def connect(*args, **kwargs) -> FakeSMTP:
        connection = FakeSMTP(*args, **kwargs)
        connections.append(connection)
        return connection

    monkeypatch.setattr(settings, "smtp_security", "starttls")
    monkeypatch.setattr(email_module.smtplib, "SMTP", connect)

    assert email_module.send_email(
        "member@sogang.ac.kr",
        "Authentication code",
        "Your code is 123456.",
        html_body="<p>Your code is <strong>123456</strong>.</p>",
    )

    assert len(connections) == 1
    connection = connections[0]
    assert (connection.host, connection.port, connection.timeout) == (
        "smtp.provider.net",
        587,
        12,
    )
    assert connection.constructor_context is None
    assert isinstance(connection.starttls_context, ssl.SSLContext)
    assert connection.starttls_context.check_hostname is True
    assert connection.starttls_context.verify_mode == ssl.CERT_REQUIRED
    assert connection.ehlo_count == 2
    assert connection.login_credentials == ("mailer", "secret")
    message = connection.sent_messages[0]
    assert message["From"] == "서강 AI-SW 대학원 커뮤니티 <no-reply@sogang.ac.kr>"
    assert message["To"] == "member@sogang.ac.kr"
    assert message["Reply-To"] == "A72040@sogang.ac.kr"
    assert parsedate_to_datetime(message["Date"]).tzinfo is not None
    assert message["Message-ID"].endswith("@sogang.ac.kr>")
    assert message["Auto-Submitted"] == "auto-generated"
    assert message.get_content_type() == "multipart/alternative"
    assert connection.sent_envelopes == [
        ("no-reply@sogang.ac.kr", ["member@sogang.ac.kr"])
    ]
    assert connection.closed is True


def test_delivery_rejects_header_injection_before_connecting(
    monkeypatch: pytest.MonkeyPatch,
    smtp_settings: None,
) -> None:
    monkeypatch.setattr(settings, "smtp_from_name", "Trusted sender\r\nBcc: attacker@example.com")

    with pytest.raises(RuntimeError, match="SMTP_FROM_NAME"):
        email_module.send_email(
            "member@sogang.ac.kr",
            "Authentication code",
            "Your code is 123456.",
        )


def test_implicit_tls_connection_check_uses_same_authenticated_transport(
    monkeypatch: pytest.MonkeyPatch,
    smtp_settings: None,
) -> None:
    connections: list[FakeSMTP] = []

    def connect_ssl(*args, **kwargs) -> FakeSMTP:
        connection = FakeSMTP(*args, **kwargs)
        connections.append(connection)
        return connection

    monkeypatch.setattr(settings, "smtp_security", "ssl")
    monkeypatch.setattr(settings, "smtp_port", 465)
    monkeypatch.setattr(email_module.smtplib, "SMTP_SSL", connect_ssl)

    assert email_module.check_email_connection() is True

    assert len(connections) == 1
    connection = connections[0]
    assert (connection.host, connection.port, connection.timeout) == (
        "smtp.provider.net",
        465,
        12,
    )
    assert isinstance(connection.constructor_context, ssl.SSLContext)
    assert connection.constructor_context.check_hostname is True
    assert connection.constructor_context.verify_mode == ssl.CERT_REQUIRED
    assert connection.starttls_context is None
    assert connection.ehlo_count == 1
    assert connection.login_credentials == ("mailer", "secret")
    assert connection.noop_count == 1
    assert connection.closed is True


def test_explicit_no_auth_relay_does_not_attempt_login(
    monkeypatch: pytest.MonkeyPatch,
    smtp_settings: None,
) -> None:
    connections: list[FakeSMTP] = []

    def connect(*args, **kwargs) -> FakeSMTP:
        connection = FakeSMTP(*args, **kwargs)
        connections.append(connection)
        return connection

    monkeypatch.setattr(settings, "smtp_auth", "none")
    monkeypatch.setattr(settings, "smtp_username", None)
    monkeypatch.setattr(settings, "smtp_password", None)
    monkeypatch.setattr(settings, "smtp_security", "starttls")
    monkeypatch.setattr(email_module.smtplib, "SMTP", connect)

    assert email_module.check_email_connection() is True
    assert connections[0].login_credentials is None
    assert connections[0].noop_count == 1
