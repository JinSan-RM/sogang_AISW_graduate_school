import math
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session

from app.account_deletion import DELETED_USER_NICKNAME
from app.board_policies import hides_author_identity
from app.deps import can_read_board, can_write_board, get_current_user, get_db, require_admin
from app.errors import AppException
from app.models.board import Board
from app.models.bookmark import Bookmark
from app.models.like import Like
from app.models.media import MediaAsset, PostAttachment
from app.models.post import Post
from app.models.post_extension import PostMutualAid, PostSuggestion
from app.models.user import User
from app.models.user_block import UserBlock
from app.notifications import create_notification
from app.post_access import post_status_read_filter, require_post_read
from app.response import success_response
from app.rate_limit import enforce_rate_limit
from app.schemas.post import MutualAidUpdate, PostCreate, PostUpdate, SuggestionUpdate
from app.security import utc_now
from app.audit import log_admin_action

router = APIRouter()

ADMIN_PARTICIPATION_BOARD_SLUGS = frozenset({"club-promo", "networking-programs"})
COUNCIL_MEMBER_WRITABLE_TYPES = frozenset({"suggestion", "mutual_aid"})
MUTUAL_AID_MIN_LEAD_DAYS = 2
SEOUL_TIME_ZONE = ZoneInfo("Asia/Seoul")


def _safe_metadata(post: Post, board: Board, *, include_sensitive: bool = False) -> dict | None:
    if not post.metadata_json:
        return None
    metadata = dict(post.metadata_json)
    if board.board_type == "activity_certification" and not include_sensitive:
        metadata.pop("bank_account", None)
    return metadata


def _metadata_for_update(post: Post, board: Board | None, incoming_metadata: dict | None) -> dict | None:
    if board is None or board.board_type != "activity_certification":
        return incoming_metadata

    metadata = dict(incoming_metadata or {})
    existing_metadata = dict(post.metadata_json or {})
    if "bank_account" in existing_metadata and "bank_account" not in metadata:
        metadata["bank_account"] = existing_metadata["bank_account"]
    return metadata or None


def _hide_post_author(post: Post, board: Board, current_user: User) -> bool:
    return current_user.role != "admin" and (post.is_anonymous or hides_author_identity(board))


def _visible_post_author_id(post: Post, board: Board, current_user: User) -> int | None:
    if post.author_id is None:
        return None
    if _hide_post_author(post, board, current_user) and post.author_id != current_user.id:
        return None
    return post.author_id


def _post_author_nickname(
    post: Post,
    board: Board,
    current_user: User,
    nickname: str | None,
) -> str:
    if post.author_id is None:
        return DELETED_USER_NICKNAME
    if _hide_post_author(post, board, current_user):
        return "Anonymous"
    return nickname or DELETED_USER_NICKNAME


def _post_author_cohort(
    post: Post,
    board: Board,
    current_user: User,
    cohort: str | None,
) -> str | None:
    if post.author_id is None or _hide_post_author(post, board, current_user):
        return None
    return cohort


def _enforce_council_management_policy(board: Board, current_user: User) -> None:
    if board.category not in {"council", "gsa"} or board.board_type in COUNCIL_MEMBER_WRITABLE_TYPES:
        return
    if current_user.role != "admin":
        raise AppException(status_code=403, message="Only admins can manage council content.", code="FORBIDDEN")


def _validate_post_content(board: Board, content: str) -> None:
    if board.board_type == "mutual_aid" or content:
        return
    raise AppException(status_code=422, message="Post content is required.", code="VALIDATION_ERROR")


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
    current_user: User = Depends(get_current_user),
):
    board = db.get(Board, board_id)
    if board is None or not board.is_active:
        raise AppException(status_code=404, message="Board not found.", code="NOT_FOUND")
    if not can_read_board(current_user, board.read_permission):
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")

    filters = [Post.board_id == board_id, Post.deleted_at.is_(None)]
    filters.append(post_status_read_filter(current_user))
    if board.board_type == "mutual_aid" and current_user.role != "admin":
        filters.append(Post.author_id == current_user.id)
    if q:
        keyword = f"%{q}%"
        if hides_author_identity(board) and current_user.role != "admin":
            filters.append(Post.title.ilike(keyword) | Post.content.ilike(keyword))
        else:
            author_match = User.nickname.ilike(keyword)
            if current_user.role != "admin":
                author_match = and_(Post.is_anonymous.is_(False), author_match)
            filters.append(Post.title.ilike(keyword) | Post.content.ilike(keyword) | author_match)
    if category:
        filters.append(Post.category == category)
    if status:
        filters.append(Post.status == status)
    blocked_author_ids = db.scalars(
        select(UserBlock.blocked_user_id).where(UserBlock.blocker_id == current_user.id)
    ).all()
    if blocked_author_ids and not hides_author_identity(board):
        filters.append(
            or_(
                Post.is_anonymous.is_(True),
                Post.author_id.is_(None),
                Post.author_id.not_in(blocked_author_ids),
            )
        )

    total = (
        db.scalar(
            select(func.count(Post.id))
            .select_from(Post)
            .outerjoin(User, User.id == Post.author_id)
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

    attachment_counts = (
        select(PostAttachment.post_id, func.count(PostAttachment.id).label("attachment_count"))
        .group_by(PostAttachment.post_id)
        .subquery()
    )
    image_attachment_order = (
        select(
            PostAttachment.post_id.label("post_id"),
            MediaAsset.id.label("thumbnail_media_id"),
            MediaAsset.url.label("thumbnail_url"),
            func.row_number()
            .over(
                partition_by=PostAttachment.post_id,
                order_by=(PostAttachment.sort_order.asc(), PostAttachment.id.asc()),
            )
            .label("rank"),
        )
        .join(MediaAsset, MediaAsset.id == PostAttachment.media_id)
        .where(MediaAsset.content_type.ilike("image/%"), MediaAsset.status == "ready")
        .subquery()
    )
    thumbnails = (
        select(
            image_attachment_order.c.post_id,
            image_attachment_order.c.thumbnail_media_id,
            image_attachment_order.c.thumbnail_url,
        )
        .where(image_attachment_order.c.rank == 1)
        .subquery()
    )

    rows = db.execute(
        select(
            Post,
            User.nickname,
            User.cohort,
            func.coalesce(attachment_counts.c.attachment_count, 0),
            thumbnails.c.thumbnail_media_id,
            thumbnails.c.thumbnail_url,
        )
        .outerjoin(User, User.id == Post.author_id)
        .outerjoin(attachment_counts, attachment_counts.c.post_id == Post.id)
        .outerjoin(thumbnails, thumbnails.c.post_id == Post.id)
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
            "author_id": _visible_post_author_id(post, board, current_user),
            "author_nickname": _post_author_nickname(post, board, current_user, nickname),
            "author_cohort": _post_author_cohort(post, board, current_user, cohort),
            "is_anonymous": post.is_anonymous,
            "is_pinned": post.is_pinned,
            "is_notice": post.is_notice,
            "status": post.status,
            "category": post.category,
            "metadata": _safe_metadata(post, board),
            "suggestion": _suggestion_payload(db, post.id) if board.board_type == "suggestion" else None,
            "mutual_aid": _mutual_aid_payload(db, post.id) if board.board_type == "mutual_aid" else None,
            "attachment_count": attachment_count,
            "thumbnail_media_id": thumbnail_media_id,
            "thumbnail_url": thumbnail_url,
            "view_count": post.view_count,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "deadline_at": post.deadline_at,
            "created_at": post.created_at,
            "highlights": {
                "title": _highlight(post.title, q),
                "content_preview": _highlight(post.content[:100], q),
            }
            if q
            else None,
        }
        for post, nickname, cohort, attachment_count, thumbnail_media_id, thumbnail_url in rows
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


def _post_attachments(db: Session, post_id: int, current_user: User) -> list[dict]:
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
            "is_private": media.is_private,
        }
        for _, media in rows
        if not media.is_private or media.owner_id == current_user.id or current_user.role == "admin"
    ]


def _replace_attachments(db: Session, post_id: int, attachment_ids: list[int], current_user: User) -> None:
    # Preserve the submitted order while preventing duplicate IDs from creating
    # repeated rows or tripping the post/media unique constraint.
    attachment_ids = list(dict.fromkeys(attachment_ids))
    post = db.get(Post, post_id)
    board = db.get(Board, post.board_id) if post is not None else None
    requires_private = board is not None and board.board_type == "mutual_aid"
    requires_album_images = board is not None and board.board_type == "album"
    requires_activity_images = board is not None and board.board_type == "activity_certification"
    requires_admin_participation_image = board is not None and board.slug in ADMIN_PARTICIPATION_BOARD_SLUGS
    if requires_private and not attachment_ids:
        raise AppException(
            status_code=400,
            message="Mutual-aid requests require private evidence.",
            code="EVIDENCE_REQUIRED",
        )
    if (requires_album_images or requires_activity_images) and not attachment_ids:
        message = "Album posts require at least one image." if requires_album_images else "Activity certifications require at least one image."
        raise AppException(status_code=400, message=message, code="IMAGE_REQUIRED")
    media_assets: list[MediaAsset] = []
    for media_id in attachment_ids:
        media = db.get(MediaAsset, media_id)
        if media is None or media.status != "ready" or (media.owner_id != current_user.id and current_user.role != "admin"):
            raise AppException(status_code=400, message="Invalid attachment.", code="BAD_REQUEST")
        if requires_private and not media.is_private:
            raise AppException(status_code=400, message="Mutual-aid evidence must use private upload.", code="PRIVATE_MEDIA_REQUIRED")
        if not requires_private and media.is_private:
            raise AppException(status_code=400, message="Private media cannot be attached to this board.", code="BAD_REQUEST")
        if (requires_album_images or requires_activity_images) and not media.content_type.lower().startswith("image/"):
            raise AppException(status_code=400, message="This board only accepts images.", code="IMAGE_ONLY")
        media_assets.append(media)
    if requires_admin_participation_image and not any(media.content_type.lower().startswith("image/") for media in media_assets):
        raise AppException(status_code=400, message="Participation guide posts require at least one image.", code="IMAGE_REQUIRED")

    db.query(PostAttachment).filter(PostAttachment.post_id == post_id).delete()
    for index, media in enumerate(media_assets):
        media_id = media.id
        db.add(PostAttachment(post_id=post_id, media_id=media_id, sort_order=index))


def _validate_admin_participation_post(board: Board, metadata: dict | None, current_user: User) -> None:
    if board.slug not in ADMIN_PARTICIPATION_BOARD_SLUGS:
        return
    if current_user.role != "admin":
        raise AppException(status_code=403, message="Only admins can manage participation guide posts.", code="FORBIDDEN")

    application_url = str((metadata or {}).get("application_url") or "").strip()
    parsed = urlparse(application_url)
    if not application_url:
        raise AppException(status_code=422, message="Participation guide posts require an application URL.", code="APPLICATION_URL_REQUIRED")
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise AppException(status_code=422, message="Application URL must use http or https.", code="INVALID_APPLICATION_URL")


def _ensure_admin_participation_image(db: Session, post: Post, board: Board) -> None:
    if board.slug not in ADMIN_PARTICIPATION_BOARD_SLUGS:
        return
    image_count = db.scalar(
        select(func.count(PostAttachment.id))
        .join(MediaAsset, MediaAsset.id == PostAttachment.media_id)
        .where(
            PostAttachment.post_id == post.id,
            MediaAsset.status == "ready",
            MediaAsset.content_type.ilike("image/%"),
        )
    ) or 0
    if image_count < 1:
        raise AppException(status_code=400, message="Participation guide posts require at least one image.", code="IMAGE_REQUIRED")


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


def _mutual_aid_payload(db: Session, post_id: int) -> dict | None:
    mutual_aid = db.scalar(select(PostMutualAid).where(PostMutualAid.post_id == post_id))
    if mutual_aid is None:
        return None
    return {
        "event_type": mutual_aid.event_type,
        "event_date": mutual_aid.event_date.isoformat(),
        "relation": mutual_aid.relation,
        "status": mutual_aid.status,
        "rejection_reason": mutual_aid.rejection_reason,
        "reviewed_by": mutual_aid.reviewed_by,
        "reviewed_at": mutual_aid.reviewed_at,
    }


def _parse_event_date(value: object) -> date:
    if not isinstance(value, str) or not value.strip():
        raise AppException(status_code=422, message="Mutual-aid event date is required.", code="VALIDATION_ERROR")
    try:
        return date.fromisoformat(value.strip().replace(".", "-"))
    except ValueError as exc:
        raise AppException(
            status_code=422,
            message="Mutual-aid event date must use YYYY-MM-DD.",
            code="VALIDATION_ERROR",
        ) from exc


def _minimum_mutual_aid_event_date(now: datetime | None = None) -> date:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(SEOUL_TIME_ZONE).date() + timedelta(days=MUTUAL_AID_MIN_LEAD_DAYS)


def _validate_mutual_aid_event_date(event_date: date) -> None:
    if event_date >= _minimum_mutual_aid_event_date():
        return
    raise AppException(
        status_code=422,
        message="Mutual-aid event date must be at least two days from today.",
        code="MUTUAL_AID_DATE_TOO_SOON",
    )


def _upsert_mutual_aid_extension(db: Session, post: Post, board: Board, category: str | None, metadata: dict | None) -> None:
    if board.board_type != "mutual_aid":
        return
    event_type = (category or "").strip()
    relation = str((metadata or {}).get("relation") or "").strip()
    if not event_type or not relation:
        raise AppException(
            status_code=422,
            message="Mutual-aid event type and relation are required.",
            code="VALIDATION_ERROR",
        )
    event_date = _parse_event_date((metadata or {}).get("event_date"))
    mutual_aid = db.scalar(select(PostMutualAid).where(PostMutualAid.post_id == post.id))
    if mutual_aid is None:
        _validate_mutual_aid_event_date(event_date)
        mutual_aid = PostMutualAid(
            post_id=post.id,
            event_type=event_type,
            event_date=event_date,
            relation=relation,
            status="processing",
        )
        db.add(mutual_aid)
        return
    if mutual_aid.status != "processing":
        raise AppException(
            status_code=400,
            message="Completed or rejected mutual-aid requests cannot be edited.",
            code="BAD_REQUEST",
        )
    if event_date != mutual_aid.event_date:
        _validate_mutual_aid_event_date(event_date)
    mutual_aid.event_type = event_type
    mutual_aid.event_date = event_date
    mutual_aid.relation = relation


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


def _suggestion_has_admin_reply(db: Session, post_id: int) -> bool:
    suggestion = db.scalar(select(PostSuggestion).where(PostSuggestion.post_id == post_id))
    return bool(suggestion and suggestion.admin_reply)


@router.get("/posts/admin/all")
def get_admin_posts(
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    q: str | None = Query(None, min_length=1),
    board_id: int | None = None,
    board_category: str | None = None,
    board_type: str | None = None,
    status: str | None = Query(None, pattern="^(draft|published|hidden|deleted)$"),
    is_pinned: bool | None = None,
    is_notice: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    filters = [Post.deleted_at.is_(None)]
    if board_id:
        filters.append(Post.board_id == board_id)
    if board_category:
        filters.append(Board.category == board_category)
    if board_type:
        filters.append(Board.board_type == board_type)
    if status:
        filters.append(Post.status == status)
    if is_pinned is not None:
        filters.append(Post.is_pinned.is_(is_pinned))
    if is_notice is not None:
        filters.append(Post.is_notice.is_(is_notice))
    if q:
        keyword = f"%{q}%"
        filters.append(Post.title.ilike(keyword) | Post.content.ilike(keyword) | User.nickname.ilike(keyword) | Board.name.ilike(keyword))

    total = (
        db.scalar(
            select(func.count(Post.id))
            .select_from(Post)
            .outerjoin(User, User.id == Post.author_id)
            .join(Board, Board.id == Post.board_id)
            .where(*filters)
        )
        or 0
    )
    total_pages = math.ceil(total / size) if total > 0 else 0

    attachment_counts = (
        select(PostAttachment.post_id, func.count(PostAttachment.id).label("attachment_count"))
        .group_by(PostAttachment.post_id)
        .subquery()
    )
    image_attachment_order = (
        select(
            PostAttachment.post_id.label("post_id"),
            MediaAsset.id.label("thumbnail_media_id"),
            MediaAsset.url.label("thumbnail_url"),
            func.row_number()
            .over(
                partition_by=PostAttachment.post_id,
                order_by=(PostAttachment.sort_order.asc(), PostAttachment.id.asc()),
            )
            .label("rank"),
        )
        .join(MediaAsset, MediaAsset.id == PostAttachment.media_id)
        .where(MediaAsset.content_type.ilike("image/%"), MediaAsset.status == "ready")
        .subquery()
    )
    thumbnails = (
        select(
            image_attachment_order.c.post_id,
            image_attachment_order.c.thumbnail_media_id,
            image_attachment_order.c.thumbnail_url,
        )
        .where(image_attachment_order.c.rank == 1)
        .subquery()
    )

    rows = db.execute(
        select(
            Post,
            User.nickname,
            User.cohort,
            Board.name.label("board_name"),
            Board.category.label("board_category"),
            Board.board_type.label("board_type"),
            func.coalesce(attachment_counts.c.attachment_count, 0),
            thumbnails.c.thumbnail_media_id,
            thumbnails.c.thumbnail_url,
        )
        .outerjoin(User, User.id == Post.author_id)
        .join(Board, Board.id == Post.board_id)
        .outerjoin(attachment_counts, attachment_counts.c.post_id == Post.id)
        .outerjoin(thumbnails, thumbnails.c.post_id == Post.id)
        .where(*filters)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    data = [
        {
            "id": post.id,
            "board_id": post.board_id,
            "board_name": board_name,
            "board_category": board_category,
            "board_type": board_type,
            "title": post.title,
            "content_preview": post.content[:100],
            "author_id": post.author_id,
            "author_nickname": nickname or DELETED_USER_NICKNAME,
            "author_cohort": cohort if post.author_id is not None else None,
            "is_anonymous": post.is_anonymous,
            "is_pinned": post.is_pinned,
            "is_notice": post.is_notice,
            "status": post.status,
            "category": post.category,
            "metadata": post.metadata_json,
            "suggestion": _suggestion_payload(db, post.id) if board_type == "suggestion" else None,
            "mutual_aid": _mutual_aid_payload(db, post.id) if board_type == "mutual_aid" else None,
            "attachment_count": attachment_count,
            "thumbnail_media_id": thumbnail_media_id,
            "thumbnail_url": thumbnail_url,
            "view_count": post.view_count,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "deadline_at": post.deadline_at,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "highlights": {
                "title": _highlight(post.title, q),
                "content_preview": _highlight(post.content[:100], q),
            }
            if q
            else None,
        }
        for post, nickname, cohort, board_name, board_category, board_type, attachment_count, thumbnail_media_id, thumbnail_url in rows
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


@router.get("/posts/{post_id}")
def get_post_detail(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.execute(
        select(Post, User.nickname, User.cohort)
        .outerjoin(User, User.id == Post.author_id)
        .where(Post.id == post_id, Post.deleted_at.is_(None))
    ).first()
    if row is None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    post, nickname, cohort = row
    board = require_post_read(db, post, current_user)

    db.execute(
        update(Post)
        .where(Post.id == post.id)
        .values(view_count=Post.view_count + 1, updated_at=post.updated_at)
    )

    user_id = current_user.id
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
            "author_id": _visible_post_author_id(post, board, current_user),
            "author_nickname": _post_author_nickname(post, board, current_user, nickname),
            "author_cohort": _post_author_cohort(post, board, current_user, cohort),
            "is_anonymous": post.is_anonymous,
            "is_pinned": post.is_pinned,
            "is_notice": post.is_notice,
            "status": post.status,
            "category": post.category,
            "metadata": _safe_metadata(post, board, include_sensitive=current_user.role == "admin"),
            "suggestion": _suggestion_payload(db, post.id),
            "mutual_aid": _mutual_aid_payload(db, post.id),
            "attachments": _post_attachments(db, post.id, current_user),
            "view_count": post.view_count,
            "like_count": post.like_count,
            "comment_count": post.comment_count,
            "deadline_at": post.deadline_at,
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enforce_rate_limit(request, action="post.create", subject=str(current_user.id), limit=20, ip_limit=60, window_seconds=300)
    board = db.get(Board, board_id)
    if board is None or not board.is_active:
        raise AppException(status_code=404, message="Board not found.", code="NOT_FOUND")
    _enforce_council_management_policy(board, current_user)
    if not can_write_board(current_user, board.write_permission):
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    _validate_post_content(board, payload.content)
    _validate_admin_participation_post(board, payload.metadata, current_user)
    if payload.is_anonymous and not board.allow_anonymous and board.board_type != "suggestion":
        raise AppException(status_code=400, message="Anonymous posts are not allowed on this board.", code="BAD_REQUEST")

    is_anonymous = True if board.board_type == "suggestion" else payload.is_anonymous
    post = Post(
        board_id=board_id,
        author_id=current_user.id,
        title=payload.title,
        content="" if board.board_type == "album" else payload.content,
        is_anonymous=is_anonymous,
        is_notice=board.board_type == "notice",
        category=None if board.board_type == "album" else payload.category,
        metadata_json=payload.metadata,
        deadline_at=payload.deadline_at if board.board_type == "notice" else None,
    )
    db.add(post)
    db.flush()
    _upsert_suggestion_extension(db, post, board, payload.category)
    _upsert_mutual_aid_extension(db, post, board, payload.category, payload.metadata)
    _replace_attachments(db, post.id, payload.attachment_ids or [], current_user)
    if post.is_notice:
        active_user_ids = db.scalars(select(User.id).where(User.is_active.is_(True))).all()
        for user_id in active_user_ids:
            create_notification(
                db,
                user_id=user_id,
                actor_id=current_user.id,
                notification_type="notice",
                message=f"새 공지: {post.title}",
                post_id=post.id,
                setting_field="notify_notice",
                dedupe_key=f"notice:{post.id}:{user_id}",
            )
        if current_user.role == "admin":
            log_admin_action(db, actor_id=current_user.id, action="notice.create", target_type="post", target_id=post.id)
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
    board = require_post_read(db, post, current_user)
    if board is not None:
        _enforce_council_management_policy(board, current_user)
        _validate_admin_participation_post(board, payload.metadata, current_user)
    if post.author_id != current_user.id and current_user.role != "admin":
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    if board is not None:
        _validate_post_content(board, payload.content)
    if board is not None and board.board_type == "suggestion" and current_user.role != "admin":
        if _suggestion_has_admin_reply(db, post.id):
            raise AppException(status_code=403, message="Answered suggestions cannot be edited.", code="FORBIDDEN")
    if payload.is_anonymous and (board is None or (not board.allow_anonymous and board.board_type != "suggestion")):
        raise AppException(status_code=400, message="Anonymous posts are not allowed on this board.", code="BAD_REQUEST")

    is_anonymous = True if board is not None and board.board_type == "suggestion" else payload.is_anonymous
    post.title = payload.title
    post.content = "" if board is not None and board.board_type == "album" else payload.content
    post.is_anonymous = is_anonymous
    post.category = None if board is not None and board.board_type == "album" else payload.category
    post.metadata_json = _metadata_for_update(post, board, payload.metadata)
    post.deadline_at = payload.deadline_at if board is not None and board.board_type == "notice" else None
    if board is not None:
        _upsert_suggestion_extension(db, post, board, payload.category)
        _upsert_mutual_aid_extension(db, post, board, payload.category, payload.metadata)
    if payload.attachment_ids is not None:
        _replace_attachments(db, post.id, payload.attachment_ids, current_user)
    if board is not None:
        _ensure_admin_participation_image(db, post, board)
    db.commit()
    db.refresh(post)

    return success_response({"id": post.id})


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    board = require_post_read(db, post, current_user)
    if post.author_id != current_user.id and current_user.role != "admin":
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    if board is not None:
        _enforce_council_management_policy(board, current_user)
    if board is not None and board.board_type == "suggestion" and current_user.role != "admin":
        if _suggestion_has_admin_reply(db, post.id):
            raise AppException(status_code=403, message="Answered suggestions cannot be deleted.", code="FORBIDDEN")
    if board is not None and board.board_type == "mutual_aid" and current_user.role != "admin":
        mutual_aid = db.scalar(select(PostMutualAid).where(PostMutualAid.post_id == post.id))
        if mutual_aid is not None and mutual_aid.status == "completed":
            raise AppException(
                status_code=403,
                message="Completed mutual-aid requests cannot be deleted.",
                code="FORBIDDEN",
            )

    from app.security import utc_now

    post.deleted_at = utc_now()
    if current_user.role == "admin":
        log_admin_action(db, actor_id=current_user.id, action="post.delete", target_type="post", target_id=post.id)
    db.commit()

    return success_response({"id": post_id})


@router.put("/posts/{post_id}/pin")
def set_post_pin(
    post_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")

    post.is_pinned = bool(payload.get("is_pinned", False))
    log_admin_action(
        db,
        actor_id=admin.id,
        action="post.pin.update",
        target_type="post",
        target_id=post.id,
        details={"is_pinned": post.is_pinned},
    )
    db.commit()
    db.refresh(post)

    return success_response({"post_id": post.id, "is_pinned": post.is_pinned})


@router.post("/posts/{post_id}/like")
def toggle_like(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    require_post_read(db, post, current_user)

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
    require_post_read(db, post, current_user)

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
    next_reply = payload.admin_reply.strip() if payload.admin_reply else None
    if payload.status == "answered" and not next_reply:
        raise AppException(
            status_code=422,
            message="An official reply is required to complete a suggestion.",
            code="ADMIN_REPLY_REQUIRED",
        )
    suggestion.admin_reply = next_reply
    suggestion.status = "answered" if next_reply else payload.status
    if next_reply:
        suggestion.replied_by = current_user.id
        suggestion.replied_at = utc_now()

    if next_reply and next_reply != previous_reply:
        create_notification(
            db,
            user_id=post.author_id,
            actor_id=current_user.id,
            notification_type="admin_reply",
            message="원우회에서 건의사항에 답변을 등록했어요.",
            post_id=post.id,
            setting_field="notify_council",
        )

    log_admin_action(
        db,
        actor_id=current_user.id,
        action="suggestion.update",
        target_type="post",
        target_id=post.id,
        details={"status": suggestion.status, "has_reply": bool(next_reply)},
    )

    db.commit()
    db.refresh(post)

    return success_response(
        {
            "post_id": post.id,
            "status": suggestion.status,
            "suggestion": _suggestion_payload(db, post.id),
        }
    )


@router.put("/posts/{post_id}/mutual-aid")
def update_mutual_aid(
    post_id: int,
    payload: MutualAidUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    post = db.get(Post, post_id)
    if post is None or post.deleted_at is not None:
        raise AppException(status_code=404, message="Post not found.", code="NOT_FOUND")
    board = db.get(Board, post.board_id)
    if board is None or board.board_type != "mutual_aid":
        raise AppException(status_code=400, message="This post is not a mutual-aid request.", code="BAD_REQUEST")

    mutual_aid = db.scalar(select(PostMutualAid).where(PostMutualAid.post_id == post_id))
    if mutual_aid is None:
        raise AppException(status_code=404, message="Mutual-aid request not found.", code="NOT_FOUND")

    rejection_reason = payload.rejection_reason.strip() if payload.rejection_reason else None
    if payload.status == "rejected" and not rejection_reason:
        raise AppException(status_code=422, message="Rejection reason is required.", code="VALIDATION_ERROR")

    previous_status = mutual_aid.status
    mutual_aid.status = payload.status
    mutual_aid.rejection_reason = rejection_reason if payload.status == "rejected" else None
    mutual_aid.reviewed_by = current_user.id
    mutual_aid.reviewed_at = utc_now()

    if previous_status != payload.status:
        status_label = {"processing": "처리중", "completed": "처리 완료", "rejected": "반려"}[payload.status]
        create_notification(
            db,
            user_id=post.author_id,
            actor_id=current_user.id,
            notification_type="council",
            message=f"상조회 신청 상태가 {status_label}(으)로 변경되었어요.",
            post_id=post.id,
            setting_field="notify_council",
        )

    log_admin_action(
        db,
        actor_id=current_user.id,
        action="mutual_aid.update",
        target_type="post",
        target_id=post.id,
        details={"status": payload.status},
    )

    db.commit()
    db.refresh(mutual_aid)
    return success_response({"post_id": post.id, "mutual_aid": _mutual_aid_payload(db, post.id)})

