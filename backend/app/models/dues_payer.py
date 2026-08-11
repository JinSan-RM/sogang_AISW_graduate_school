from datetime import datetime

from sqlalchemy import DateTime, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DuesPayer(Base):
    __tablename__ = "dues_payers"
    __table_args__ = (
        UniqueConstraint("student_number", name="uq_dues_payers_student_number"),
        Index("ix_dues_payers_name", "name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_number: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    major: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
