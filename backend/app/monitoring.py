from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from urllib import request

from app.config import settings


logger = logging.getLogger(__name__)

_ALLOWED_CONTEXT_KEYS = frozenset(
    {
        "checked_count",
        "delivery_count",
        "error_type",
        "failed_count",
        "method",
        "route",
    }
)


def send_operational_alert(
    event: str,
    *,
    severity: str = "error",
    context: dict[str, str | int | bool | None] | None = None,
) -> bool:
    """Deliver a provider-neutral, non-PII operational alert.

    The webhook endpoint is supplied through the deployment secret store. The
    adapter never logs that URL or exception text because either may contain a
    provider credential.
    """

    webhook_url = settings.operations_alert_webhook_url
    if not webhook_url:
        logger.error("Operational alert has no configured delivery provider: event=%s", event)
        return False

    safe_context = {
        key: value
        for key, value in (context or {}).items()
        if key in _ALLOWED_CONTEXT_KEYS
    }
    payload = {
        "schema_version": 1,
        "service": "aisw-backend",
        "environment": settings.app_environment,
        "event": event,
        "severity": severity,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "context": safe_context,
    }
    alert_request = request.Request(
        webhook_url,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "aisw-operations-alert/1",
        },
        method="POST",
    )
    try:
        with request.urlopen(
            alert_request,
            timeout=settings.operations_alert_timeout_seconds,
        ) as response:
            return 200 <= response.status < 300
    except Exception as exc:
        logger.error(
            "Operational alert delivery failed: event=%s error_type=%s",
            event,
            type(exc).__name__,
        )
        return False
