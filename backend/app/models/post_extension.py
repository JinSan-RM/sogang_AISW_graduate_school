from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PostLectureReview(Base):
    __tablename__ = "post_lecture_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), unique=True, nullable=False)
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    professor: Mapped[str | None] = mapped_column(String(50))
    semester: Mapped[str | None] = mapped_column(String(20))
    difficulty: Mapped[int | None] = mapped_column(SmallInteger)
    satisfaction: Mapped[int | None] = mapped_column(SmallInteger)


class PostSuggestion(Base):
    __tablename__ = "post_suggestions"
    __table_args__ = (
        CheckConstraint("status IN ('received', 'answered')", name="ck_post_suggestions_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), unique=True, nullable=False)
    suggestion_category: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="received", nullable=False)
    admin_reply: Mapped[str | None] = mapped_column(Text)
    replied_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    replied_at: Mapped[datetime | None] = mapped_column(DateTime)


class PostMutualAid(Base):
    __tablename__ = "post_mutual_aid"
    __table_args__ = (
        CheckConstraint(
            "status IN ('processing', 'completed', 'rejected')",
            name="ck_post_mutual_aid_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    relation: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="processing", nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
