import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_current_user_optional, get_db
from app.models.board import Board
from app.models.post import Post
from app.models.search import SearchHistory
from app.models.user import User
from app.response import success_response
from app.routers.posts import _highlight

router = APIRouter()


@router.get("")
def search(
    q: str = Query(..., min_length=2),
    scope: str = Query("all", pattern="^(all|board|notices|community|participation|council|resources)$"),
    board_id: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    keyword = f"%{q}%"
    filters = [Post.deleted_at.is_(None), Board.is_active.is_(True)]
    if scope == "board" and board_id is not None:
        filters.append(Post.board_id == board_id)
    elif scope != "all":
        filters.append(Board.category == scope)

    filters.append(Post.title.ilike(keyword) | Post.content.ilike(keyword) | User.nickname.ilike(keyword))

    total = (
        db.scalar(
            select(func.count(Post.id))
            .select_from(Post)
            .join(Board, Board.id == Post.board_id)
            .join(User, User.id == Post.author_id)
            .where(*filters)
        )
        or 0
    )
    total_pages = math.ceil(total / size) if total > 0 else 0

    rows = db.execute(
        select(Post, Board.name, User.nickname)
        .join(Board, Board.id == Post.board_id)
        .join(User, User.id == Post.author_id)
        .where(*filters)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    if current_user is not None:
        db.add(SearchHistory(user_id=current_user.id, keyword=q))
        db.commit()

    data = [
        {
            "type": "post",
            "id": post.id,
            "board_id": post.board_id,
            "board_name": board_name,
            "title": post.title,
            "content_preview": post.content[:100],
            "author_nickname": "Anonymous" if post.is_anonymous else nickname,
            "created_at": post.created_at,
            "highlights": {
                "title": _highlight(post.title, q),
                "content_preview": _highlight(post.content[:100], q),
            },
        }
        for post, board_name, nickname in rows
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


@router.get("/recent")
def recent_searches(db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    if current_user is None:
        return success_response([])

    rows = db.scalars(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc(), SearchHistory.id.desc())
        .limit(10)
    ).all()

    return success_response([{"keyword": row.keyword, "searched_at": row.created_at} for row in rows])
