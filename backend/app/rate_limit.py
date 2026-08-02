import hashlib
import hmac
from datetime import timedelta
from ipaddress import IPv4Address, IPv6Address, ip_address

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


def subject_rate_limit_hash(subject: str) -> str:
    """Return the persisted hash used for a subject-scoped rate-limit key."""

    return _subject_hash(f"subject:{subject.strip().lower()}")


def _parsed_ip(value: str) -> IPv4Address | IPv6Address | None:
    try:
        return ip_address(value.strip())
    except ValueError:
        return None


def _client_ip(request: Request) -> str:
    direct_client = request.client.host if request.client is not None else "unknown"
    if not settings.rate_limit_trust_proxy:
        return direct_client

    direct_address = _parsed_ip(direct_client)
    trusted_networks = settings.rate_limit_trusted_proxy_networks()
    if direct_address is None or not any(
        direct_address.version == network.version and direct_address in network
        for network in trusted_networks
    ):
        return direct_client

    # Cloudflare documents CF-Connecting-IP as the canonical single visitor
    # address. It is trusted only after the direct TCP peer matched the narrow
    # ingress allowlist above, so clients cannot spoof it through a public
    # origin port.
    connecting_ip = request.headers.get("cf-connecting-ip")
    if connecting_ip is not None:
        connecting_address = _parsed_ip(connecting_ip)
        return str(connecting_address) if connecting_address is not None else direct_client

    forwarded_values = [
        value.strip()
        for value in request.headers.get("x-forwarded-for", "").split(",")
        if value.strip()
    ]
    forwarded_addresses = [_parsed_ip(value) for value in forwarded_values]
    if not forwarded_addresses or any(address is None for address in forwarded_addresses):
        return direct_client

    valid_forwarded_addresses = [address for address in forwarded_addresses if address is not None]
    for address in reversed(valid_forwarded_addresses):
        if not any(
            address.version == network.version and address in network
            for network in trusted_networks
        ):
            return str(address)
    return direct_client


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
