from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OperationalAuditLog(Base):
    __tablename__ = "operational_audit_logs"
    __table_args__ = (
        Index("ix_operational_audit_logs_actor_created", "actor_id", "created_at"),
        Index("ix_operational_audit_logs_target", "target_type", "target_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_id: Mapped[int | None] = mapped_column(nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class AccountDeletionReceipt(Base):
    __tablename__ = "account_deletion_receipts"
    __table_args__ = (
        CheckConstraint(
            "channel IN ('authenticated', 'public_email')",
            name="ck_account_deletion_receipts_channel",
        ),
        CheckConstraint(
            "result = 'completed'",
            name="ck_account_deletion_receipts_result",
        ),
        Index("ix_account_deletion_receipts_completed_at", "completed_at"),
    )

    # Deliberately contains no user id, email, IP address, or deletion counts.
    receipt_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    result: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class LegacyImportRecord(Base):
    """Non-public provenance and exception ledger for the legacy app import."""

    __tablename__ = "legacy_import_records"
    __table_args__ = (
        UniqueConstraint(
            "source_file",
            "source_sheet",
            "entity_type",
            "source_id",
            name="uq_legacy_import_records_source_entity",
        ),
        Index("ix_legacy_import_records_status_entity", "status", "entity_type"),
        Index("ix_legacy_import_records_target", "target_table", "target_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_file: Mapped[str] = mapped_column(String(255), nullable=False)
    source_sheet: Mapped[str] = mapped_column(String(100), nullable=False)
    source_row: Mapped[int | None] = mapped_column(nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    source_id: Mapped[str] = mapped_column(String(100), nullable=False)
    source_parent_id: Mapped[str | None] = mapped_column(String(100))
    source_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    target_table: Mapped[str | None] = mapped_column(String(100))
    target_id: Mapped[int | None] = mapped_column(nullable=True)
    reason: Mapped[str | None] = mapped_column(String(500))
    redacted_details: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
