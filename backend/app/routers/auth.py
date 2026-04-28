from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_current_user, get_db
from app.email import is_email_configured, send_email
from app.errors import AppException
from app.models.auth import EmailVerificationToken, PasswordResetToken, RefreshToken
from app.models.notification import NotificationSetting
from app.models.user import User
from app.response import success_response
from app.schemas.auth import (
    EmailVerificationConfirm,
    EmailVerificationRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
)
from app.security import (
    create_access_token,
    ensure_password_policy,
    ensure_school_email,
    generate_token_urlsafe,
    generate_verification_code,
    hash_password,
    hash_token,
    utc_now,
    verify_password,
)

router = APIRouter()


def _user_payload(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "cohort": user.cohort,
        "role": user.role,
    }


def _issue_tokens(db: Session, user: User) -> dict:
    refresh_token = generate_token_urlsafe()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=utc_now() + timedelta(days=settings.refresh_token_expire_days),
        )
    )
    user.last_login_at = utc_now()
    db.commit()

    return {
        "access_token": create_access_token(user.id, user.role),
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
        "user": _user_payload(user),
    }


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise AppException(status_code=401, message="Invalid email or password.", code="UNAUTHORIZED")
    if not user.is_active:
        raise AppException(status_code=403, message="Inactive account.", code="FORBIDDEN")

    return success_response(_issue_tokens(db, user))


@router.post("/register/request-verification")
def request_register_verification(payload: EmailVerificationRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    ensure_school_email(email)

    existing_user = db.scalar(select(User.id).where(User.email == email))
    if existing_user is not None:
        raise AppException(status_code=409, message="Email already registered.", code="CONFLICT")

    code = generate_verification_code()
    db.add(
        EmailVerificationToken(
            email=email,
            code_hash=hash_token(code),
            purpose="register",
            expires_at=utc_now() + timedelta(minutes=settings.email_verification_expire_minutes),
        )
    )
    db.commit()

    data = {"email": email, "expires_in": settings.email_verification_expire_minutes * 60}
    send_email(
        email,
        "Sogang AI-SW Community verification code",
        f"Your verification code is {code}.\n\nThis code expires in {settings.email_verification_expire_minutes} minutes.",
    )
    if settings.dev_auth_codes:
        data["dev_code"] = code
    data["email_sent"] = is_email_configured()
    return success_response(data)


@router.post("/register/verify-email")
def verify_register_email(payload: EmailVerificationConfirm, db: Session = Depends(get_db)):
    email = payload.email.lower()
    token = db.scalar(
        select(EmailVerificationToken)
        .where(
            EmailVerificationToken.email == email,
            EmailVerificationToken.purpose == "register",
            EmailVerificationToken.consumed_at.is_(None),
        )
        .order_by(EmailVerificationToken.created_at.desc(), EmailVerificationToken.id.desc())
        .limit(1)
    )
    if token is None or token.expires_at < utc_now() or token.code_hash != hash_token(payload.code):
        raise AppException(status_code=400, message="Invalid or expired verification code.", code="BAD_REQUEST")

    verification_token = generate_token_urlsafe()
    token.code_hash = hash_token(verification_token)
    token.consumed_at = utc_now()
    db.commit()

    return success_response({"verification_token": verification_token, "expires_in": 15 * 60})


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    ensure_password_policy(payload.password)

    verification_token_hash = hash_token(payload.verification_token)
    verification = db.scalar(
        select(EmailVerificationToken)
        .where(
            EmailVerificationToken.code_hash == verification_token_hash,
            EmailVerificationToken.purpose == "register",
            EmailVerificationToken.consumed_at.is_not(None),
        )
        .order_by(EmailVerificationToken.consumed_at.desc(), EmailVerificationToken.id.desc())
        .limit(1)
    )
    if verification is None:
        raise AppException(status_code=400, message="Invalid verification token.", code="BAD_REQUEST")

    existing_user = db.scalar(select(User.id).where(User.email == verification.email))
    if existing_user is not None:
        raise AppException(status_code=409, message="Email already registered.", code="CONFLICT")

    user = User(
        username=verification.email,
        password_hash=hash_password(payload.password),
        nickname=payload.nickname,
        cohort=payload.cohort,
        major=payload.major,
        phone=payload.phone,
        email=verification.email,
        role="user",
    )
    db.add(user)
    db.flush()
    db.add(NotificationSetting(user_id=user.id))
    db.commit()
    db.refresh(user)

    return success_response(_issue_tokens(db, user))


@router.post("/refresh")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.refresh_token)
    refresh_token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if refresh_token is None or refresh_token.revoked_at is not None or refresh_token.expires_at < utc_now():
        raise AppException(status_code=401, message="Invalid refresh token.", code="UNAUTHORIZED")

    user = db.get(User, refresh_token.user_id)
    if user is None or not user.is_active:
        raise AppException(status_code=401, message="Invalid refresh token.", code="UNAUTHORIZED")

    refresh_token.revoked_at = utc_now()
    return success_response(_issue_tokens(db, user))


@router.post("/logout")
def logout(payload: LogoutRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    refresh_token = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(payload.refresh_token)))
    if refresh_token is not None and refresh_token.revoked_at is None:
        refresh_token.revoked_at = utc_now()
        db.commit()

    return success_response({"logged_out": True})


@router.post("/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    data = {"accepted": True}
    if user is not None and user.is_active:
        reset_token = generate_token_urlsafe()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(reset_token),
                expires_at=utc_now() + timedelta(minutes=settings.password_reset_expire_minutes),
            )
        )
        db.commit()
        send_email(
            user.email,
            "Sogang AI-SW Community password reset",
            "Use this token to reset your password:\n\n"
            f"{reset_token}\n\n"
            f"This token expires in {settings.password_reset_expire_minutes} minutes.",
        )
        if settings.dev_auth_codes:
            data["dev_token"] = reset_token
        data["email_sent"] = is_email_configured()
    return success_response(data)


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    ensure_password_policy(payload.new_password)
    reset_token = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(payload.token)))
    if reset_token is None or reset_token.consumed_at is not None or reset_token.expires_at < utc_now():
        raise AppException(status_code=400, message="Invalid or expired reset token.", code="BAD_REQUEST")

    user = db.get(User, reset_token.user_id)
    if user is None or not user.is_active:
        raise AppException(status_code=400, message="Invalid or expired reset token.", code="BAD_REQUEST")

    user.password_hash = hash_password(payload.new_password)
    reset_token.consumed_at = utc_now()
    db.commit()

    return success_response({"changed": True})
