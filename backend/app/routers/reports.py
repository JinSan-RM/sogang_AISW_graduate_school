import math

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.account_deletion import DELETED_USER_NICKNAME
from app.deps import get_current_user, get_db, require_admin
from app.errors import AppException
from app.models.comment import Comment
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.notifications import notify_admins
from app.post_access import require_comment_read, require_post_read
from app.response import success_response
from app.rate_limit import enforce_rate_limit
from app.schemas.report import ReportCreate, ReportStatusUpdate
from app.security import utc_now
from app.audit import log_admin_action

router = APIRouter()

REPORT_STATUSES = {"open", "reviewing", "resolved", "dismissed"}


def _create_report(target_type: str, target_id: int, payload: ReportCreate, db: Session, user: User):
    existing = db.scalar(
        select(Report).where(
            Report.reporter_id == user.id,
            Report.target_type == target_type,
            Report.target_id == target_id,
        )
    )
    if existing is not None:
        return success_response({"id": existing.id, "status": existing.status, "duplicate": True})

    report = Report(
        reporter_id=user.id,
        target_type=target_type,
        target_id=target_id,
        reason=payload.reason,
        detail=payload.detail,
        status="open",
    )
    db.add(report)
    notify_admins(
        db,
        actor_id=user.id,
        notification_type="report",
        message=f"{user.nickname} reported a {target_type}.",
        post_id=target_id if target_type == "post" else None,
    )
    db.commit()
    db.refresh(report)
    return success_response({"id": report.id, "status": report.status, "duplicate": False})


def _post_target_payload(db: Session, post_id: int) -> dict:
    row = db.execute(
        select(Post, User.nickname)
        .outerjoin(User, User.id == Post.author_id)
        .where(Post.id == post_id)
    ).first()
    if row is None:
        return {"target_exists": False, "target_deleted": True}

    post, author_nickname = row
    return {
        "target_exists": True,
        "target_deleted": post.deleted_at is not None,
        "post_id": post.id,
        "board_id": post.board_id,
        "title": post.title,
        "content_preview": post.content[:160],
        "author_id": post.author_id,
        "author_nickname": DELETED_USER_NICKNAME
        if post.author_id is None
        else ("Anonymous" if post.is_anonymous else author_nickname),
    }


def _comment_target_payload(db: Session, comment_id: int) -> dict:
    row = db.execute(
        select(Comment, Post, User.nickname)
        .join(Post, Post.id == Comment.post_id)
        .outerjoin(User, User.id == Comment.author_id)
        .where(Comment.id == comment_id)
    ).first()
    if row is None:
        return {"target_exists": False, "target_deleted": True}

    comment, post, author_nickname = row
    return {
        "target_exists": True,
        "target_deleted": post.deleted_at is not None,
        "post_id": post.id,
        "board_id": post.board_id,
        "title": post.title,
        "content_preview": comment.content[:160],
        "author_id": comment.author_id,
        "author_nickname": author_nickname or DELETED_USER_NICKNAME,
    }


def _report_payload(db: Session, report: Report, reporter_nickname: str) -> dict:
    if report.target_type == "post":
        target = _post_target_payload(db, report.target_id)
    else:
        target = _comment_target_payload(db, report.target_id)

    return {
        "id": report.id,
        "target_type": report.target_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "detail": report.detail,
        "status": report.status,
        "reporter_id": report.reporter_id,
        "reporter_nickname": reporter_nickname,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "target": target,
    }


@router.get("/admin/reports")
def get_admin_reports(
    status: str | None = Query("open"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    filters = []
    if status and status != "all":
        if status not in REPORT_STATUSES:
            raise AppException(status_code=400, message="Invalid report status.", code="BAD_REQUEST")
        filters.append(Report.status == status)

    total = db.scalar(select(func.count(Report.id)).where(*filters)) or 0
    total_pages = math.ceil(total / size) if total > 0 else 0
    rows = db.execute(
        select(Report, User.nickname)
        .join(User, User.id == Report.reporter_id)
        .where(*filters)
        .order_by(Report.created_at.desc(), Report.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return success_response(
        [_report_payload(db, report, reporter_nickname) for report, reporter_nickname in rows],
        pagination={"page": page, "size": size, "total": total, "total_pages": total_pages},
    )


@router.put("/admin/reports/{report_id}")
def update_admin_report(
    report_id: int,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    report = db.get(Report, report_id)
    if report is None:
        raise AppException(status_code=404, message="Report not found.", code="NOT_FOUND")

    report.status = payload.status
    report.updated_at = utc_now()
    log_admin_action(
        db,
        actor_id=admin.id,
        action="report.status.update",
        target_type="report",
        target_id=report.id,
        details={"status": payload.status},
    )
    db.commit()
    db.refresh(report)

    reporter = db.get(User, report.reporter_id)
    return success_response(_report_payload(db, report, reporter.nickname if reporter else "unknown"))


@router.post("/posts/{post_id}/report")
def report_post(
    post_id: int,
    payload: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_rate_limit(request, action="report.create", subject=str(user.id), limit=10, ip_limit=30, window_seconds=3600)
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    require_post_read(db, post, user)
    if post.author_id == user.id:
        raise AppException(status_code=400, message="You cannot report your own post.", code="BAD_REQUEST")
    return _create_report("post", post_id, payload, db, user)


@router.post("/comments/{comment_id}/report")
def report_comment(
    comment_id: int,
    payload: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_rate_limit(request, action="report.create", subject=str(user.id), limit=10, ip_limit=30, window_seconds=3600)
    comment, _, _ = require_comment_read(db, db.get(Comment, comment_id), user)
    if comment.author_id == user.id:
        raise AppException(status_code=400, message="You cannot report your own comment.", code="BAD_REQUEST")
    return _create_report("comment", comment_id, payload, db, user)
