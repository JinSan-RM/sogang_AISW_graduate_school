from collections.abc import Generator

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.errors import AppException
from app.models.user import User
from app.security import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        raise AppException(status_code=401, message="Invalid authorization scheme.", code="UNAUTHORIZED")

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AppException(status_code=401, message="Invalid access token.", code="UNAUTHORIZED") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise AppException(status_code=401, message="Invalid access token.", code="UNAUTHORIZED")
    return user


def get_current_user(user: User | None = Depends(get_current_user_optional)) -> User:
    if user is None:
        raise AppException(status_code=401, message="Authentication required.", code="UNAUTHORIZED")
    return user


def get_current_user_id(user: User = Depends(get_current_user)) -> int:
    return user.id


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise AppException(status_code=403, message="Admin permission required.", code="FORBIDDEN")
    return user


def can_write_board(user: User, write_permission: str) -> bool:
    if user.role == "admin":
        return True
    if write_permission == "user":
        return True
    if write_permission == "admin":
        return False
    return False
