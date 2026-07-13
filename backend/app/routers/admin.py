import math
from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_db, require_admin
from app.models.audit import OperationalAuditLog
from app.models.comment import Comment
from app.models.event import Event
from app.models.notification import PushDelivery, PushToken
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.response import success_response
from app.security import utc_now


router = APIRouter()


def _count(db: Session, statement) -> int:
    return int(db.scalar(statement) or 0)


@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    thirty_days_ago = utc_now() - timedelta(days=30)
    return success_response(
        {
            "users_total": _count(db, select(func.count(User.id))),
            "users_active": _count(db, select(func.count(User.id)).where(User.is_active.is_(True))),
            "users_active_30d": _count(
                db,
                select(func.count(User.id)).where(User.last_login_at >= thirty_days_ago, User.is_active.is_(True)),
            ),
            "admins": _count(db, select(func.count(User.id)).where(User.role == "admin", User.is_active.is_(True))),
            "posts": _count(db, select(func.count(Post.id)).where(Post.deleted_at.is_(None))),
            "notices": _count(
                db,
                select(func.count(Post.id)).where(Post.deleted_at.is_(None), Post.is_notice.is_(True)),
            ),
            "comments": _count(db, select(func.count(Comment.id))),
            "events": _count(db, select(func.count(Event.id))),
            "open_reports": _count(db, select(func.count(Report.id)).where(Report.status.in_(["open", "reviewing"]))),
            "active_push_tokens": _count(
                db,
                select(func.count(PushToken.id)).where(PushToken.is_active.is_(True)),
            ),
            "push_failed": _count(db, select(func.count(PushDelivery.id)).where(PushDelivery.status == "failed")),
        }
    )


@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    action: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    filters = [OperationalAuditLog.action == action] if action else []
    total = _count(db, select(func.count(OperationalAuditLog.id)).where(*filters))
    rows = db.execute(
        select(OperationalAuditLog, User.nickname)
        .outerjoin(User, User.id == OperationalAuditLog.actor_id)
        .where(*filters)
        .order_by(OperationalAuditLog.created_at.desc(), OperationalAuditLog.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return success_response(
        [
            {
                "id": item.id,
                "actor_id": item.actor_id,
                "actor_nickname": actor_nickname or "system",
                "action": item.action,
                "target_type": item.target_type,
                "target_id": item.target_id,
                "details": item.details,
                "created_at": item.created_at,
            }
            for item, actor_nickname in rows
        ],
        pagination={
            "page": page,
            "size": size,
            "total": total,
            "total_pages": math.ceil(total / size) if total else 0,
        },
    )
