import hashlib
import hmac
from datetime import timedelta

from fastapi import Request
from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert

from app.config import settings
from app.database import SessionLocal
from app.errors import AppException
from app.models.rate_limit import RateLimitBucket
from app.security import utc_now


def _subject_hash(value: str) -> str:
    return hmac.new(settings.auth_secret_key.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def _client_ip(request: Request) -> str:
    if settings.rate_limit_trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
        if forwarded:
            return forwarded
    return request.client.host if request.client is not None else "unknown"


def enforce_rate_limit(
    request: Request,
    *,
    action: str,
    subject: str | None = None,
    limit: int,
    ip_limit: int | None = None,
    window_seconds: int,
) -> None:
    if not settings.rate_limit_enabled:
        return

    identifiers = [(f"ip:{_client_ip(request)}", ip_limit or limit)]
    if subject:
        identifiers.append((f"subject:{subject.strip().lower()}", limit))

    now = utc_now()
    cutoff = now - timedelta(seconds=window_seconds)
    exceeded = False
    with SessionLocal() as db:
        for identifier, identifier_limit in identifiers:
            statement = (
                insert(RateLimitBucket)
                .values(
                    action=action,
                    subject_hash=_subject_hash(identifier),
                    window_started_at=now,
                    count=1,
                    updated_at=now,
                )
                .on_conflict_do_update(
                    constraint="uq_rate_limit_action_subject",
                    set_={
                        "window_started_at": case(
                            (RateLimitBucket.window_started_at < cutoff, now),
                            else_=RateLimitBucket.window_started_at,
                        ),
                        "count": case(
                            (RateLimitBucket.window_started_at < cutoff, 1),
                            else_=RateLimitBucket.count + 1,
                        ),
                        "updated_at": now,
                    },
                )
                .returning(RateLimitBucket.count)
            )
            count = db.execute(statement).scalar_one()
            exceeded = exceeded or count > identifier_limit
        db.commit()

    if exceeded:
        raise AppException(
            status_code=429,
            message="Too many requests. Please try again later.",
            code="RATE_LIMITED",
        )
