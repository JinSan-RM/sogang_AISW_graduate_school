from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.audit import OperationalAuditLog
from app.models.user import User


def promote_initial_admin(db: Session, *, email: str) -> int:
    """Promote exactly one existing active member when no administrator exists."""

    normalized_email = email.strip().lower()
    if not normalized_email:
        raise RuntimeError("An existing member email is required.")

    bind = db.get_bind()
    if bind.dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext('aisw-initial-admin-bootstrap'))"))

    active_admins = int(
        db.scalar(
            select(func.count(User.id)).where(
                User.role == "admin",
                User.is_active.is_(True),
            )
        )
        or 0
    )
    if active_admins:
        raise RuntimeError(
            "An active administrator already exists. Use the authenticated admin API for later role changes."
        )

    user = db.scalar(
        select(User)
        .where(
            func.lower(User.email) == normalized_email,
            User.is_active.is_(True),
        )
        .with_for_update()
    )
    if user is None:
        raise RuntimeError("No active member matches the supplied email.")

    user.role = "admin"
    db.add(
        OperationalAuditLog(
            actor_id=None,
            action="admin.bootstrap.initial",
            target_type="user",
            target_id=user.id,
            details=None,
        )
    )
    db.commit()
    return user.id
