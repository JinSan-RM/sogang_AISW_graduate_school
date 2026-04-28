import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import can_write_board, get_current_user, get_current_user_optional, get_db, require_admin
from app.errors import AppException
from app.models.board import Board
from app.models.bookmark import Bookmark
from app.models.like import Like
from app.models.media import MediaAsset, PostAttachment
from app.models.post import Post
from app.models.post_extension import PostSuggestion
from app.models.user import User
from app.notifications import create_notification
from app.response import success_response
from app.schemas.post import PostCreate, PostUpdate, SuggestionUpdate
from app.security import utc_now

router = APIRouter()


@router.get("/boards/{board_id}/posts")
def get_posts(
    board_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, min_length=1),
    category: str | None = None,
    status: str | None = None,
    sort: str = Query("latest", pattern="^(latest|popular|views)$"),
    db: Session = Depends(get_db),
):
    board = db.get(Board, board_id)
    if board is None or not board.is_active:
        raise AppException(status_code=404, message="Board not found.", code="NOT_FOUND")

    filters = [Post.board_id == board_id, Post.deleted_at.is_(None)]
    if q:
        keyword = f"%{q}%"
        filters.append(Post.title.ilike(keyword) | Post.content.ilike(keyword) | User.nickname.ilike(keyword))
    if category:
        filters.append(Post.category == category)
    if status:
        filters.append(Post.status == status)

    total = (
        db.scalar(
            select(func.count(Post.id))
            .select_from(Post)
            .join(User, User.id == Post.author_id)
            .where(*filters)
        )
        or 0
    )
    total_pages = math.ceil(total / size) if total > 0 else 0

    if sort == "popular":
        order_by = (Post.is_pinned.desc(), Post.like_count.desc(), Post.comment_count.desc(), Post.created_at.desc())
    elif sort == "views":
        order_by = (Post.is_pinned.desc(), Post.view_count.desc(), Post.created_at.desc())
    else:
        order_by = (Post.is_pinned.desc(), Post.created_at.desc(), Post.id.desc())

    rows = db.execute(
        select(Post, User.nickname)
        .join(User, User.id == Post.author_id)
        .where(*filters)
        .order_by(*order_by)
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    data = [
        {
            "id": post.id,
            "board_id": post.board_id,
            "title": post.title,
            "content_preview": post.content[:100],
            "author_id": post.author_id,
            "author_nickname": "Anonymous" if post.is_anonymous else nickname,
            "is_anonymous": post.is_anonymous,
            "is_pinned": post.is_pinned,
            "is_notice": post.is_notice,
            "status": post.status,
            "category": post.category,
            "view_count": post.view_count,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "created_at": post.created_at,
            "highlights": {
                "title": _highlight(post.title, q),
                "content_preview": _highlight(post.content[:100], q),
            }
            if q
            else None,
        }
        for post, nickname in rows
    ]

    return success_response(
        data,
        pagination={
            "page": page,
            "size": size,
            "total": total,
            "total_pages": total_pages,
        },
    )


def _highlight(text: str, keyword: str | None) -> str:
    if not keyword:
        return text
    lower_text = text.lower()
    lower_keyword = keyword.lower()
    start = lower_text.find(lower_keyword)
    if start < 0:
        return text
    end = start + len(keyword)
    return f"{text[:start]}<mark>{text[start:end]}</mark>{text[end:]}"


def _post_attachments(db: Session, post_id: int) -> list[dict]:
    rows = db.execute(
        select(PostAttachment, MediaAsset)
        .join(MediaAsset, MediaAsset.id == PostAttachment.media_id)
        .where(PostAttachment.post_id == post_id)
        .order_by(PostAttachment.sort_order.asc(), PostAttachment.id.asc())
    ).all()
    return [
        {
            "id": media.id,
            "original_filename": media.original_filename,
            "content_type": media.content_type,
            "file_size": media.file_size,
            "url": media.url,
        }
        for _, media in rows
    ]


def _replace_attachments(db: Session, post_id: int, attachment_ids: list[int], owner_id: int) -> None:
    db.query(PostAttachment).filter(PostAttachment.post_id == post_id).delete()
    for index, media_id in enumerate(attachment_ids):
        media = db.get(MediaAsset, media_id)
        if media is None or media.owner_id != owner_id or media.status != "ready":
            raise AppException(status_code=400, message="Invalid attachment.", code="BAD_REQUEST")
        db.add(PostAttachment(post_id=post_id, media_id=media_id, sort_order=index))


def _suggestion_payload(db: Session, post_id: int) -> dict | None:
    suggestion = db.scalar(select(PostSuggestion).where(PostSuggestion.post_id == post_id))
    if suggestion is None:
        return None
    return {
        "category": suggestion.suggestion_category,
        "status": suggestion.status,
        "admin_reply": suggestion.admin_reply,
        "replied_by": suggestion.replied_by,
        "replied_at": suggestion.replied_at,
    }


def _upsert_suggestion_extension(db: Session, post: Post, board: Board, category: str | None) -> None:
    if board.board_type != "suggestion":
        return
    suggestion = db.scalar(select(PostSuggestion).where(PostSuggestion.post_id == post.id))
    if suggestion is None:
        suggestion = PostSuggestion(
            post_id=post.id,
            suggestion_category=category,
            status="received",
        )
        db.add(suggestion)
    else:
        suggestion.suggestion_category = category
    post.status = suggestion.status


@router.get("/posts/{post_id}")
def get_post_detail(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    row = db.execute(
        select(Post, User.nickname)
        .join(User, User.id == Post.author_id)
        .where(Post.id == post_id, Post.deleted_at.is_(None))
    ).first()
    if row is None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    post, nickname = row
    post.view_count += 1

    user_id = current_user.id if current_user is not None else None
    is_liked = False
    is_bookmarked = False
    if user_id is not None:
        is_liked = db.scalar(
            select(Like.id).where(Like.post_id == post_id, Like.user_id == user_id).limit(1)
        ) is not None
        is_bookmarked = db.scalar(
            select(Bookmark.id).where(Bookmark.post_id == post_id, Bookmark.user_id == user_id).limit(1)
        ) is not None

    db.commit()
    db.refresh(post)

    return success_response(
        {
            "id": post.id,
            "board_id": post.board_id,
            "title": post.title,
            "content": post.content,
            "author_id": post.author_id,
            "author_nickname": "Anonymous" if post.is_anonymous else nickname,
            "is_anonymous": post.is_anonymous,
            "is_pinned": post.is_pinned,
            "is_notice": post.is_notice,
            "status": post.status,
            "category": post.category,
            "metadata": post.metadata_json,
            "suggestion": _suggestion_payload(db, post.id),
            "attachments": _post_attachments(db, post.id),
            "view_count": post.view_count,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "is_liked": is_liked,
            "is_bookmarked": is_bookmarked,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
        }
    )


@router.post("/boards/{board_id}/posts")
def create_post(
    board_id: int,
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = db.get(Board, board_id)
    if board is None or not board.is_active:
        raise AppException(status_code=404, message="Board not found.", code="NOT_FOUND")
    if not can_write_board(current_user, board.write_permission):
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    if payload.is_anonymous and not board.allow_anonymous:
        raise AppException(status_code=400, message="Anonymous posts are not allowed on this board.", code="BAD_REQUEST")

    post = Post(
        board_id=board_id,
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
        is_anonymous=payload.is_anonymous,
        is_notice=board.board_type == "notice",
        category=payload.category,
        metadata_json=payload.metadata,
    )
    db.add(post)
    db.flush()
    _upsert_suggestion_extension(db, post, board, payload.category)
    _replace_attachments(db, post.id, payload.attachment_ids or [], current_user.id)
    db.commit()
    db.refresh(post)

    return success_response({"id": post.id})


@router.put("/posts/{post_id}")
def update_post(
    post_id: int,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    board = db.get(Board, post.board_id)
    if post.author_id != current_user.id and current_user.role != "admin":
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    if payload.is_anonymous and (board is None or not board.allow_anonymous):
        raise AppException(status_code=400, message="Anonymous posts are not allowed on this board.", code="BAD_REQUEST")

    post.title = payload.title
    post.content = payload.content
    post.is_anonymous = payload.is_anonymous
    post.category = payload.category
    post.metadata_json = payload.metadata
    if board is not None:
        _upsert_suggestion_extension(db, post, board, payload.category)
    if payload.attachment_ids is not None:
        _replace_attachments(db, post.id, payload.attachment_ids, current_user.id)
    db.commit()
    db.refresh(post)

    return success_response({"id": post.id})


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    if post.author_id != current_user.id and current_user.role != "admin":
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")

    from app.security import utc_now

    post.deleted_at = utc_now()
    db.commit()

    return success_response({"id": post_id})


@router.put("/posts/{post_id}/pin")
def set_post_pin(
    post_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    post.is_pinned = bool(payload.get("is_pinned", False))
    db.commit()
    db.refresh(post)

    return success_response({"post_id": post.id, "is_pinned": post.is_pinned})


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    like = db.scalar(select(Like).where(Like.post_id == post_id, Like.user_id == user_id))
    if like is None:
        db.add(Like(post_id=post_id, user_id=user_id))
        post.like_count += 1
        is_liked = True
        create_notification(
            db,
            user_id=post.author_id,
            actor_id=current_user.id,
            notification_type="like",
            message=f"{current_user.nickname} liked your post.",
            post_id=post.id,
            setting_field="notify_like",
        )
    else:
        db.delete(like)
        post.like_count = max(0, post.like_count - 1)
        is_liked = False

    db.commit()
    db.refresh(post)

    return success_response({"post_id": post_id, "is_liked": is_liked, "like_count": post.like_count})


@router.post("/posts/{post_id}/bookmark")
def toggle_bookmark(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    bookmark = db.scalar(select(Bookmark).where(Bookmark.post_id == post_id, Bookmark.user_id == user_id))
    if bookmark is None:
        db.add(Bookmark(post_id=post_id, user_id=user_id))
        is_bookmarked = True
    else:
        db.delete(bookmark)
        is_bookmarked = False

    db.commit()

    return success_response({"post_id": post_id, "is_bookmarked": is_bookmarked})


@router.put("/posts/{post_id}/suggestion")
def update_suggestion(
    post_id: int,
    payload: SuggestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    board = db.get(Board, post.board_id)
    if board is None or board.board_type != "suggestion":
        raise AppException(status_code=400, message="This post is not a suggestion.", code="BAD_REQUEST")

    suggestion = db.scalar(select(PostSuggestion).where(PostSuggestion.post_id == post_id))
    if suggestion is None:
        suggestion = PostSuggestion(post_id=post_id, suggestion_category=post.category)
        db.add(suggestion)

    previous_reply = suggestion.admin_reply
    suggestion.status = payload.status
    suggestion.admin_reply = payload.admin_reply.strip() if payload.admin_reply else None
    if suggestion.admin_reply:
        suggestion.replied_by = current_user.id
        suggestion.replied_at = utc_now()
    post.status = payload.status

    if suggestion.admin_reply and suggestion.admin_reply != previous_reply:
        create_notification(
            db,
            user_id=post.author_id,
            actor_id=current_user.id,
            notification_type="admin_reply",
            message="The student council replied to your suggestion.",
            post_id=post.id,
            setting_field="notify_notice",
        )

    db.commit()
    db.refresh(post)

    return success_response(
        {
            "post_id": post.id,
            "status": post.status,
            "suggestion": _suggestion_payload(db, post.id),
        }
    )

