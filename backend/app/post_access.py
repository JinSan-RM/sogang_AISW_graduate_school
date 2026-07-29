from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.deps import can_read_board
from app.errors import AppException
from app.models.board import Board
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User


def _post_not_found() -> AppException:
    return AppException(status_code=404, message="Post not found.", code="NOT_FOUND")


def _comment_not_found() -> AppException:
    return AppException(status_code=404, message="Comment not found.", code="NOT_FOUND")


def require_post_read(db: Session, post: Post, user: User) -> Board:
    """Return the post's board when the user may read it.

    Read denials are deliberately indistinguishable from a missing post. This
    prevents private mutual-aid requests (and posts on inaccessible boards)
    from being enumerated through post, comment, or media endpoints.
    """

    board = db.get(Board, post.board_id)
    if board is None or (not board.is_active and user.role != "admin"):
        raise _post_not_found()
    if not can_read_board(user, board.read_permission):
        raise _post_not_found()
    if user.role != "admin":
        author_unpublished = post.status in {"draft", "hidden"} and post.author_id == user.id
        if post.status != "published" and not author_unpublished:
            raise _post_not_found()
    if board.board_type == "mutual_aid" and post.author_id != user.id and user.role != "admin":
        raise _post_not_found()
    return board


def require_comment_read(
    db: Session,
    comment: Comment | None,
    user: User,
) -> tuple[Comment, Post, Board]:
    """Resolve a comment without exposing whether its parent post is hidden."""

    if comment is None:
        raise _comment_not_found()
    post = db.get(Post, comment.post_id)
    if post is None or post.deleted_at is not None:
        raise _comment_not_found()
    try:
        board = require_post_read(db, post, user)
    except AppException as exc:
        if exc.status_code == 404:
            raise _comment_not_found() from exc
        raise
    return comment, post, board


def post_status_read_filter(user: User) -> ColumnElement[bool]:
    """Limit unpublished posts to their author and administrators."""

    if user.role == "admin":
        return Post.id.is_not(None)
    return or_(
        Post.status == "published",
        and_(Post.status.in_(("draft", "hidden")), Post.author_id == user.id),
    )


def post_read_filter(user: User) -> ColumnElement[bool]:
    """Build the SQL visibility predicate used by cross-board post queries."""

    if user.role == "admin":
        return Post.id.is_not(None)
    conditions: list[ColumnElement[bool]] = [
        Board.is_active.is_(True),
        Board.read_permission.in_(("guest", "user")),
        post_status_read_filter(user),
        or_(Board.board_type != "mutual_aid", Post.author_id == user.id),
    ]
    return and_(*conditions)
