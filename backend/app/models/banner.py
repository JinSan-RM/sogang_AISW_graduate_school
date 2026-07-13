from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Banner(Base):
    __tablename__ = "banners"
    __table_args__ = (
        CheckConstraint("placement IN ('home')", name="ck_banners_placement"),
        CheckConstraint("theme IN ('none', 'blue', 'navy', 'cyan', 'purple')", name="ck_banners_theme"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    placement: Mapped[str] = mapped_column(String(30), default="home", nullable=False)
    title: Mapped[str | None] = mapped_column(String(120))
    subtitle: Mapped[str | None] = mapped_column(Text)
    badge_text: Mapped[str | None] = mapped_column(String(80))
    cta_label: Mapped[str | None] = mapped_column(String(50))
    cta_href: Mapped[str | None] = mapped_column(String(255))
    image_url: Mapped[str | None] = mapped_column(String(500))
    image_urls: Mapped[dict | None] = mapped_column(JSONB)
    theme: Mapped[str] = mapped_column(String(20), default="blue", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
