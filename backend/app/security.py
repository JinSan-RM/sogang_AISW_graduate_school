import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import settings
from app.errors import AppException


PBKDF2_ITERATIONS = 120_000


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected = password_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations))
    return hmac.compare_digest(digest.hex(), expected)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_token_urlsafe() -> str:
    return secrets.token_urlsafe(32)


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def create_access_token(subject: int, role: str) -> str:
    now = utc_now()
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_expire_minutes)).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(settings.auth_secret_key.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256)
    return f"{signing_input}.{_b64url_encode(signature.digest())}"


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise AppException(status_code=401, message="Invalid access token.", code="UNAUTHORIZED") from exc

    signing_input = f"{header_b64}.{payload_b64}"
    expected = hmac.new(settings.auth_secret_key.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256)
    if not hmac.compare_digest(_b64url_encode(expected.digest()), signature_b64):
        raise AppException(status_code=401, message="Invalid access token.", code="UNAUTHORIZED")

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (json.JSONDecodeError, ValueError) as exc:
        raise AppException(status_code=401, message="Invalid access token.", code="UNAUTHORIZED") from exc

    exp = payload.get("exp")
    if not isinstance(exp, int) or exp < int(utc_now().timestamp()):
        raise AppException(status_code=401, message="Access token expired.", code="UNAUTHORIZED")

    return payload


def ensure_password_policy(password: str) -> None:
    if len(password) < 8:
        raise AppException(status_code=422, message="Password must be at least 8 characters.", code="VALIDATION_ERROR")


def ensure_school_email(email: str) -> None:
    domain = email.rsplit("@", 1)[-1].lower()
    if domain != "sogang.ac.kr":
        raise AppException(status_code=422, message="Only sogang.ac.kr emails are allowed.", code="VALIDATION_ERROR")
