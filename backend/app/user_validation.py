from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import AppException
from app.models.user import User


def normalize_nickname(value: str) -> str:
    return " ".join(value.strip().split())


def nickname_is_taken(db: Session, nickname: str, *, exclude_user_id: int | None = None) -> bool:
    normalized = normalize_nickname(nickname)
    query = select(User.id).where(func.lower(User.nickname) == normalized.lower())
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    return db.scalar(query.limit(1)) is not None


def ensure_nickname_available(db: Session, nickname: str, *, exclude_user_id: int | None = None) -> str:
    normalized = normalize_nickname(nickname)
    if not normalized:
        raise AppException(status_code=422, message="Nickname is required.", code="VALIDATION_ERROR")
    if nickname_is_taken(db, normalized, exclude_user_id=exclude_user_id):
        raise AppException(status_code=409, message="Nickname already in use.", code="NICKNAME_CONFLICT")
    return normalized
