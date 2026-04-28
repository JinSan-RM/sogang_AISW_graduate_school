from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import AppException
from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.response import success_response
from app.schemas.user import UserDeactivateRequest, UserMeUpdate, UserPasswordUpdate
from app.security import ensure_password_policy, hash_password, verify_password

router = APIRouter()


@router.get('/me')
def get_me(user: User = Depends(get_current_user)):
    return success_response(
        {
            "id": user.id,
            "nickname": user.nickname,
            "cohort": user.cohort,
            "major": user.major,
            "phone": user.phone,
            "company": user.company,
            "job_title": user.job_title,
            "position": user.position,
            "email": user.email,
            "role": user.role,
        }
    )


@router.put('/me')
def update_me(payload: UserMeUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return success_response({"id": user.id})


@router.get('/me/activity')
def get_my_activity(
    activity_type: str | None = Query(None, alias="type", pattern="^(posts|comments|bookmarks)$"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    offset = (page - 1) * size

    if activity_type == "comments":
        total = db.scalar(select(func.count(Comment.id)).where(Comment.author_id == user.id)) or 0
        comments = db.execute(
            select(Comment, Post.title, Post.board_id)
            .join(Post, Post.id == Comment.post_id)
            .where(Comment.author_id == user.id, Post.deleted_at.is_(None))
            .order_by(Comment.created_at.desc(), Comment.id.desc())
            .offset(offset)
            .limit(size)
        ).all()
        data = [
            {
                "type": "comment",
                "id": comment.id,
                "post_id": comment.post_id,
                "title": title,
                "content_preview": comment.content[:100],
                "board_id": board_id,
                "created_at": comment.created_at,
            }
            for comment, title, board_id in comments
        ]
    elif activity_type == "bookmarks":
        total = (
            db.scalar(
                select(func.count(Bookmark.id))
                .join(Post, Post.id == Bookmark.post_id)
                .where(Bookmark.user_id == user.id, Post.deleted_at.is_(None))
            )
            or 0
        )
        bookmarks = db.execute(
            select(Bookmark, Post)
            .join(Post, Post.id == Bookmark.post_id)
            .where(Bookmark.user_id == user.id, Post.deleted_at.is_(None))
            .order_by(Bookmark.created_at.desc(), Bookmark.id.desc())
            .offset(offset)
            .limit(size)
        ).all()
        data = [
            {
                "type": "bookmark",
                "id": bookmark.id,
                "post_id": post.id,
                "title": post.title,
                "content_preview": post.content[:100],
                "board_id": post.board_id,
                "created_at": bookmark.created_at,
            }
            for bookmark, post in bookmarks
        ]
    else:
        filters = [Post.author_id == user.id, Post.deleted_at.is_(None)]
        total = db.scalar(select(func.count(Post.id)).where(*filters)) or 0
        posts = db.scalars(
            select(Post)
            .where(*filters)
            .order_by(Post.created_at.desc(), Post.id.desc())
            .offset(offset)
            .limit(size)
        ).all()
        data = [
            {
                "type": "post",
                "id": post.id,
                "post_id": post.id,
                "title": post.title,
                "content_preview": post.content[:100],
                "board_id": post.board_id,
                "created_at": post.created_at,
            }
            for post in posts
        ]

    total_pages = (total + size - 1) // size if total else 0
    return success_response(data, pagination={"page": page, "size": size, "total": total, "total_pages": total_pages})


@router.put('/me/password')
def update_password(payload: UserPasswordUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, user.password_hash):
        raise AppException(status_code=403, message="Current password is invalid.", code="FORBIDDEN")
    ensure_password_policy(payload.new_password)

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return success_response({"changed": True})


@router.delete('/me')
def deactivate_me(
    _: UserDeactivateRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.is_active = False
    db.commit()

    return success_response({"deactivated": True})

