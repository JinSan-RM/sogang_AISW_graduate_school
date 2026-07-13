from sqlalchemy.orm import Session

from app.models.audit import OperationalAuditLog


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
