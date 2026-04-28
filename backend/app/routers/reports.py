from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import AppException
from app.models.comment import Comment
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.notifications import notify_admins
from app.response import success_response
from app.schemas.report import ReportCreate

router = APIRouter()


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


@router.post("/posts/{post_id}/report")
def report_post(
    post_id: int,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    if post.author_id == user.id:
        raise AppException(status_code=400, message="You cannot report your own post.", code="BAD_REQUEST")
    return _create_report("post", post_id, payload, db, user)


@router.post("/comments/{comment_id}/report")
def report_comment(
    comment_id: int,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise AppException(status_code=404, message="Comment not found.", code="NOT_FOUND")
    if comment.author_id == user.id:
        raise AppException(status_code=400, message="You cannot report your own comment.", code="BAD_REQUEST")
    return _create_report("comment", comment_id, payload, db, user)
