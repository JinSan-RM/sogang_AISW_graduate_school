from __future__ import annotations

import json
import logging

from app.config import settings
from app.monitoring import send_operational_alert
from app import monitoring


class _Response:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None


def test_operational_alert_adapter_sends_only_structured_context(monkeypatch) -> None:
    captured = {}

    def fake_urlopen(alert_request, *, timeout):
        captured["url"] = alert_request.full_url
        captured["timeout"] = timeout
        captured["payload"] = json.loads(alert_request.data)
        return _Response()

    monkeypatch.setattr(settings, "operations_alert_webhook_url", "https://alerts.example.net/secret-hook")
    monkeypatch.setattr(settings, "operations_alert_timeout_seconds", 3)
    monkeypatch.setattr(monitoring.request, "urlopen", fake_urlopen)

    assert send_operational_alert(
        "worker.notification.failed",
        context={
            "error_type": "RuntimeError",
            "failed_count": 2,
            "email": "member@example.net",
            "token": "secret-device-token",
        },
    )
    assert captured["url"] == "https://alerts.example.net/secret-hook"
    assert captured["timeout"] == 3
    assert captured["payload"]["event"] == "worker.notification.failed"
    assert captured["payload"]["context"] == {
        "error_type": "RuntimeError",
        "failed_count": 2,
    }
    assert "email" not in json.dumps(captured["payload"]).lower()
    assert "token" not in json.dumps(captured["payload"]).lower()


def test_operational_alert_failure_does_not_log_webhook_secret(monkeypatch, caplog) -> None:
    secret_url = "https://alerts.example.net/hooks/super-secret-value"
    monkeypatch.setattr(settings, "operations_alert_webhook_url", secret_url)

    def fail_urlopen(*_args, **_kwargs):
        raise OSError(f"provider failed for {secret_url}")

    monkeypatch.setattr(monitoring.request, "urlopen", fail_urlopen)

    with caplog.at_level(logging.ERROR):
        assert not send_operational_alert("api.unhandled_exception")

    assert secret_url not in caplog.text
    assert "super-secret-value" not in caplog.text
