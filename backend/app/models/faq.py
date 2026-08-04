from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FAQ(Base):
    __tablename__ = "faqs"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class FAQAttachment(Base):
    __tablename__ = "faq_attachments"
    __table_args__ = (
        UniqueConstraint("faq_id", "media_id", name="uq_faq_attachments_faq_media"),
        Index("ix_faq_attachments_faq_sort", "faq_id", "sort_order"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    faq_id: Mapped[int] = mapped_column(ForeignKey("faqs.id", ondelete="CASCADE"), nullable=False)
    media_id: Mapped[int] = mapped_column(ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
