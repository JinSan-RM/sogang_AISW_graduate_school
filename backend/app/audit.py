from typing import Literal

from sqlalchemy.orm import Session

from app.models.audit import OperationalAuditLog, UserPostActivityLog


def log_admin_action(
    db: Session,
    *,
    actor_id: int,
    action: str,
    target_type: str,
    target_id: int | None = None,
    details: dict | None = None,
) -> None:
    db.add(
        OperationalAuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
        )
    )


def log_user_post_action(
    db: Session,
    *,
    actor_id: int,
    action: Literal["post.create", "post.update", "post.delete"],
    board_id: int,
    post_id: int,
) -> None:
    db.add(UserPostActivityLog(actor_id=actor_id, action=action, board_id=board_id, post_id=post_id))
