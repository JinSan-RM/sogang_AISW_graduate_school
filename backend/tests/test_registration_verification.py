import re
from datetime import timedelta

from sqlalchemy import func, select

from app import seed as seed_module
from app.config import settings
from app.models.auth import EmailVerificationToken
from app.models.registration import MajorOption, PrivacyPolicyVersion
from app.models.user import User
from app.routers import auth as auth_router
from app.security import (
    hash_token,
    hash_verification_code,
    utc_now,
    verify_verification_code,
)


def test_verification_code_hash_is_keyed_and_legacy_hashes_remain_compatible() -> None:
    email = "new-member@sogang.ac.kr"
    code = "123456"
    code_hash = hash_verification_code(code, email=email, purpose="register")

    assert code_hash.startswith("hmac-sha256:v1:")
    assert code_hash != hash_token(code)
    assert verify_verification_code(code, code_hash, email=email, purpose="register")
    assert not verify_verification_code("654321", code_hash, email=email, purpose="register")
    assert not verify_verification_code(code, code_hash, email="other@sogang.ac.kr", purpose="register")
    assert not verify_verification_code(code, code_hash, email=email, purpose="account_delete")

    legacy_hash = hash_token(code)
    assert verify_verification_code(code, legacy_hash, email=email, purpose="register")


def test_local_demo_seed_leaves_user_id_to_the_database_sequence(monkeypatch) -> None:
    created_user_kwargs: dict[str, object] = {}

    class FakeUser:
        def __init__(self, **kwargs) -> None:
            created_user_kwargs.update(kwargs)
            self.id = None
            self.password_hash = kwargs["password_hash"]
            self.cohort = kwargs.get("cohort")

    class FakeSession:
        user: FakeUser | None = None

        def get(self, model, user_id: int):
            assert model is FakeUser
            assert user_id == 1
            return None

        def add(self, user: FakeUser) -> None:
            self.user = user

        def flush(self) -> None:
            assert self.user is not None
            self.user.id = 1

    seed_calls: list[tuple[int, bool]] = []
    monkeypatch.setattr(seed_module, "User", FakeUser)
    monkeypatch.setattr(seed_module, "hash_password", lambda _password: "hashed-password")
    monkeypatch.setattr(
        seed_module,
        "seed_reference_data",
        lambda _db, *, creator_id, authoritative: seed_calls.append((creator_id, authoritative)),
    )

    seed_module.seed_initial_data(FakeSession())

    assert "id" not in created_user_kwargs
    assert seed_calls == [(1, True)]


def test_fifth_failed_attempt_blocks_a_later_correct_registration_code(api) -> None:
    email = "attempt-limit@sogang.ac.kr"
    correct_code = "123456"
    with api.session() as db:
        db.add(
            EmailVerificationToken(
                email=email,
                code_hash=hash_verification_code(correct_code, email=email, purpose="register"),
                purpose="register",
                expires_at=utc_now() + timedelta(minutes=5),
                attempt_count=4,
            )
        )
        db.commit()

    fifth_failure = api.client.post(
        "/api/auth/register/verify-email",
        json={"email": email, "code": "000000"},
    )
    assert fifth_failure.status_code == 429
    assert fifth_failure.json()["code"] == "VERIFICATION_ATTEMPTS_EXCEEDED"

    correct_after_limit = api.client.post(
        "/api/auth/register/verify-email",
        json={"email": email, "code": correct_code},
    )
    assert correct_after_limit.status_code == 429
    assert correct_after_limit.json()["code"] == "VERIFICATION_ATTEMPTS_EXCEEDED"

    with api.session() as db:
        token = db.scalar(
            select(EmailVerificationToken).where(EmailVerificationToken.email == email)
        )
        assert token is not None
        assert token.attempt_count == 5
        assert token.consumed_at is None


def test_registration_resend_cooldown_returns_retry_after_header(api, monkeypatch) -> None:
    email = "resend-cooldown@sogang.ac.kr"
    monkeypatch.setattr(settings, "email_verification_resend_cooldown_seconds", 300)
    with api.session() as db:
        db.add(
            EmailVerificationToken(
                email=email,
                code_hash=hash_verification_code("123456", email=email, purpose="register"),
                purpose="register",
                expires_at=utc_now() + timedelta(minutes=5),
            )
        )
        db.commit()

    response = api.client.post(
        "/api/auth/register/request-verification",
        json={"email": email},
    )

    assert response.status_code == 429
    assert response.json()["code"] == "VERIFICATION_RESEND_COOLDOWN"
    assert 1 <= int(response.headers["retry-after"]) <= settings.email_verification_resend_cooldown_seconds
    assert response.headers["cache-control"] == "no-store"


def test_legacy_registration_code_can_finish_verification(api) -> None:
    email = "legacy-code@sogang.ac.kr"
    code = "234567"
    with api.session() as db:
        db.add(
            EmailVerificationToken(
                email=email,
                code_hash=hash_token(code),
                purpose="register",
                expires_at=utc_now() + timedelta(minutes=5),
            )
        )
        db.commit()

    response = api.client.post(
        "/api/auth/register/verify-email",
        json={"email": email, "code": code},
    )
    assert response.status_code == 200
    verification_token = response.json()["data"]["verification_token"]

    with api.session() as db:
        token = db.scalar(
            select(EmailVerificationToken).where(EmailVerificationToken.email == email)
        )
        assert token is not None
        assert token.consumed_at is not None
        assert token.code_hash == hash_token(verification_token)


def test_registration_token_is_deleted_after_first_successful_use(api) -> None:
    email = "one-time-signup@sogang.ac.kr"
    verification_token = "one-time-verification-token"
    policy_version = "registration-security-test-v1"
    major = "인공지능"
    with api.session() as db:
        db.add_all(
            [
                MajorOption(name=major, sort_order=1, is_active=True),
                PrivacyPolicyVersion(
                    version=policy_version,
                    effective_at=utc_now(),
                    is_active=True,
                ),
                EmailVerificationToken(
                    email=email,
                    code_hash=hash_token(verification_token),
                    purpose="register",
                    expires_at=utc_now() + timedelta(minutes=15),
                    consumed_at=utc_now(),
                ),
            ]
        )
        db.commit()

    payload = {
        "verification_token": verification_token,
        "password": "SignupPassword1!",
        "nickname": "Secure Signup",
        "cohort": "72",
        "major": major,
        "phone": "01012345678",
        "privacy_policy_version": policy_version,
        "privacy_consent": True,
    }
    first_response = api.client.post("/api/auth/register", json=payload)
    assert first_response.status_code == 200
    assert first_response.json()["data"]["user"]["email"] == email

    replay_payload = {**payload, "nickname": "Replay Attempt"}
    replay_response = api.client.post("/api/auth/register", json=replay_payload)
    assert replay_response.status_code == 400
    assert replay_response.json()["code"] == "BAD_REQUEST"

    with api.session() as db:
        token_count = db.scalar(
            select(func.count())
            .select_from(EmailVerificationToken)
            .where(EmailVerificationToken.email == email)
        )
        user_count = db.scalar(
            select(func.count()).select_from(User).where(User.email == email)
        )
        assert token_count == 0
        assert user_count == 1


def test_full_email_verification_and_registration_flow_uses_one_time_token(
    api,
    monkeypatch,
) -> None:
    email = "captured-email-signup@sogang.ac.kr"
    policy_version = "captured-email-flow-v1"
    major = "AI-SW 융합"
    captured_email: dict[str, str | None] = {}

    def capture_email(
        recipient: str,
        subject: str,
        plain_body: str,
        *,
        html_body: str | None = None,
    ) -> bool:
        captured_email.update(
            recipient=recipient,
            subject=subject,
            plain_body=plain_body,
            html_body=html_body,
        )
        return True

    monkeypatch.setattr(auth_router, "is_email_configured", lambda: True)
    monkeypatch.setattr(auth_router, "send_email", capture_email)

    with api.session() as db:
        db.add_all(
            [
                MajorOption(name=major, sort_order=1, is_active=True),
                PrivacyPolicyVersion(
                    version=policy_version,
                    effective_at=utc_now(),
                    is_active=True,
                ),
            ]
        )
        db.commit()

    request_response = api.client.post(
        "/api/auth/register/request-verification",
        json={"email": email},
    )
    assert request_response.status_code == 200
    assert request_response.headers["cache-control"] == "no-store"
    assert request_response.headers["pragma"] == "no-cache"
    request_data = request_response.json()["data"]
    assert request_data["email_sent"] is True
    assert captured_email["recipient"] == email

    plain_body = captured_email["plain_body"]
    assert plain_body is not None
    code_match = re.search(r"(?<!\d)(\d{6})(?!\d)", plain_body)
    assert code_match is not None
    emailed_code = code_match.group(1)
    assert emailed_code not in request_response.text
    assert "code" not in request_data
    assert "dev_code" not in request_data
    assert captured_email["html_body"] is not None
    assert emailed_code in captured_email["html_body"]

    verify_response = api.client.post(
        "/api/auth/register/verify-email",
        json={"email": email, "code": emailed_code},
    )
    assert verify_response.status_code == 200
    verification_token = verify_response.json()["data"]["verification_token"]

    register_payload = {
        "verification_token": verification_token,
        "password": "CapturedEmail1!",
        "nickname": "Captured Email Signup",
        "cohort": "73",
        "major": major,
        "phone": "01098765432",
        "privacy_policy_version": policy_version,
        "privacy_consent": True,
    }
    register_response = api.client.post("/api/auth/register", json=register_payload)
    assert register_response.status_code == 200
    assert register_response.json()["data"]["user"]["email"] == email

    replay_response = api.client.post(
        "/api/auth/register",
        json={**register_payload, "nickname": "Captured Email Replay"},
    )
    assert replay_response.status_code == 400
    assert replay_response.json()["code"] == "BAD_REQUEST"

    with api.session() as db:
        assert db.scalar(
            select(func.count())
            .select_from(EmailVerificationToken)
            .where(EmailVerificationToken.email == email)
        ) == 0


def test_registration_email_delivery_failure_is_normalized_and_discards_code(
    api,
    monkeypatch,
) -> None:
    email = "smtp-failure@sogang.ac.kr"

    monkeypatch.setattr(auth_router, "is_email_configured", lambda: True)

    def fail_email(*_args, **_kwargs) -> bool:
        raise OSError("simulated provider outage")

    monkeypatch.setattr(auth_router, "send_email", fail_email)

    response = api.client.post(
        "/api/auth/register/request-verification",
        json={"email": email},
    )

    assert response.status_code == 503
    assert response.json()["code"] == "EMAIL_DELIVERY_UNAVAILABLE"
    assert response.headers["cache-control"] == "no-store"
    with api.session() as db:
        assert db.scalar(
            select(func.count())
            .select_from(EmailVerificationToken)
            .where(EmailVerificationToken.email == email)
        ) == 0
