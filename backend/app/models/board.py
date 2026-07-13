from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Board(Base):
    __tablename__ = "boards"
    __table_args__ = (
        CheckConstraint(
            "board_type IN ('post', 'notice', 'calendar', 'album', 'resource', "
            "'activity_certification', 'guide', 'faq', 'organization_intro', "
            "'activity_history', 'external_link', 'suggestion', 'mutual_aid')",
            name="ck_boards_board_type",
        ),
        CheckConstraint("read_permission IN ('guest', 'user', 'admin')", name="ck_boards_read_permission"),
        CheckConstraint("write_permission IN ('guest', 'user', 'admin')", name="ck_boards_write_permission"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    board_type: Mapped[str] = mapped_column(String(50), default="post", nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    allow_anonymous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_permission: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    write_permission: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    posts = relationship("Post", backref="board")
