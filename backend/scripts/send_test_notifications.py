"""Send sample notifications to one user, each tied to a real row in the database.

Every message is built by app.notifications so the wording matches production, and
every notification links to the post/event it actually talks about. When no matching
row exists (no 상조회 신청, no 건의사항, ...), the sample is skipped with a hint
instead of being faked against unrelated data.
"""

from pathlib import Path
import argparse
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import delete, select

from app.database import SessionLocal
from app.models.board import Board
from app.models.comment import Comment
from app.models.event import Event
from app.models.notification import Notification
from app.models.post import Post
from app.models.post_extension import PostMutualAid
from app.models.user import User
from app.notifications import (
    ADMIN_REPLY_MESSAGE,
    MUTUAL_AID_MESSAGES,
    comment_message,
    create_notification,
    deadline_message,
    event_message,
    like_message,
    notice_message,
)

DEDUPE_PREFIX = "qa-test:"
SAMPLE_NAMES = ["notice", "deadline", "comment", "like", "event", "mutual_aid", "admin_reply"]


def _own_posts(user_id: int):
    return select(Post).where(Post.author_id == user_id, Post.deleted_at.is_(None)).order_by(Post.id.desc())


def _board_posts(board_type: str):
    return (
        select(Post)
        .join(Board, Board.id == Post.board_id)
        .where(Board.board_type == board_type, Post.deleted_at.is_(None))
        .order_by(Post.id.desc())
    )


def build_jobs(db, user_id: int) -> list[tuple[str, str, str | None, int | None, int | None, str]]:
    """(name, notification_type, message|None, post_id, event_id, hint when skipped)"""
    own_post = db.scalar(_own_posts(user_id))
    liked_post = db.scalar(_own_posts(user_id).where(Post.like_count > 0)) or own_post
    comment = db.scalar(
        select(Comment)
        .join(Post, Post.id == Comment.post_id)
        .where(Post.author_id == user_id, Post.deleted_at.is_(None))
        .order_by(Comment.id.desc())
    )
    notice = db.scalar(_board_posts("notice"))
    deadline_notice = db.scalar(_board_posts("notice").where(Post.deadline_at.is_not(None)))
    suggestion = db.scalar(_board_posts("suggestion").where(Post.author_id == user_id))
    mutual_aid = db.scalar(
        select(PostMutualAid)
        .join(Post, Post.id == PostMutualAid.post_id)
        .where(Post.author_id == user_id, Post.deleted_at.is_(None))
        .order_by(PostMutualAid.post_id.desc())
    )
    event = db.scalar(select(Event).order_by(Event.start_at.desc()))

    return [
        (
            "notice", "notice",
            notice_message(notice.title) if notice else None,
            notice.id if notice else None, None,
            "공지 게시판에 글이 없습니다",
        ),
        (
            "deadline", "notice",
            deadline_message(deadline_notice.title, 1) if deadline_notice else None,
            deadline_notice.id if deadline_notice else None, None,
            "마감일(deadline_at)이 설정된 공지가 없습니다",
        ),
        (
            "comment", "comment",
            comment_message(comment.content) if comment else None,
            comment.post_id if comment else None, None,
            "내 글에 달린 댓글이 없습니다",
        ),
        (
            "like", "like",
            like_message(liked_post.title) if liked_post else None,
            liked_post.id if liked_post else None, None,
            "내가 쓴 글이 없습니다",
        ),
        (
            "event", "event",
            event_message(event.title, 0) if event else None,
            None, event.id if event else None,
            "등록된 일정이 없습니다",
        ),
        (
            "mutual_aid", "council",
            MUTUAL_AID_MESSAGES.get(mutual_aid.status) if mutual_aid else None,
            mutual_aid.post_id if mutual_aid else None, None,
            "내 상조회 신청이 없습니다 (앱에서 신청 후 다시 실행)",
        ),
        (
            "admin_reply", "admin_reply",
            ADMIN_REPLY_MESSAGE if suggestion else None,
            suggestion.id if suggestion else None, None,
            "내 건의사항 글이 없습니다",
        ),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("user", help="Recipient email, username, or numeric user id.")
    parser.add_argument("types", nargs="*", choices=SAMPLE_NAMES, help=f"Defaults to all: {' '.join(SAMPLE_NAMES)}")
    parser.add_argument("--clear", action="store_true", help="Only delete previously sent QA notifications.")
    args = parser.parse_args()

    with SessionLocal() as db:
        target = args.user.strip()
        user = (
            db.get(User, int(target))
            if target.isdigit()
            else db.scalar(select(User).where((User.email == target.lower()) | (User.username == target)))
        )
        if user is None:
            raise SystemExit(f"User not found: {args.user}")

        wanted = set(args.types or SAMPLE_NAMES)
        # Reruns replace the previous QA rows for the requested types only, so sending one
        # type does not wipe the rest of the batch. --clear wipes everything this script sent.
        scope = (
            Notification.dedupe_key.like(f"{DEDUPE_PREFIX}%")
            if args.clear
            else Notification.dedupe_key.in_([f"{DEDUPE_PREFIX}{name}:{user.id}" for name in wanted])
        )
        removed = db.execute(delete(Notification).where(Notification.user_id == user.id, scope)).rowcount
        if removed:
            print(f"cleared   {removed} previous QA notifications")
        if args.clear:
            db.commit()
            return

        for name, notification_type, message, post_id, event_id, hint in build_jobs(db, user.id):
            if name not in wanted:
                continue
            if message is None:
                print(f"skipped   {name:<11} {hint}")
                continue
            create_notification(
                db,
                user_id=user.id,
                actor_id=None,
                notification_type=notification_type,
                message=message,
                post_id=post_id,
                event_id=event_id,
                setting_field=None,
                dedupe_key=f"{DEDUPE_PREFIX}{name}:{user.id}",
            )
            link = f"post={post_id}" if post_id else f"event={event_id}"
            print(f"sent      {name:<11} [{link}] {message}")

        db.commit()
        username = user.username

    print(f"\nDone. Open the 알림 screen as {username}.")


if __name__ == "__main__":
    main()
