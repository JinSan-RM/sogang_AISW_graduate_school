"""align 260705 policy rules

Revision ID: 0009_policy_260705_alignment
Revises: 0008_banner_responsive_images
Create Date: 2026-07-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0009_policy_260705_alignment"
down_revision: Union[str, None] = "0008_banner_responsive_images"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    return table_name in set(sa.inspect(op.get_bind()).get_table_names())


def _has_check(table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return constraint_name in {constraint["name"] for constraint in inspector.get_check_constraints(table_name)}


def _drop_check(table_name: str, constraint_name: str) -> None:
    if _has_table(table_name) and _has_check(table_name, constraint_name):
        op.drop_constraint(constraint_name, table_name, type_="check")


def _create_check(table_name: str, constraint_name: str, condition: str) -> None:
    if _has_table(table_name) and not _has_check(table_name, constraint_name):
        op.create_check_constraint(constraint_name, table_name, condition)


def upgrade() -> None:
    if _has_table("boards"):
        op.execute("UPDATE boards SET read_permission = 'user' WHERE read_permission = 'guest'")
        op.execute(
            "UPDATE boards "
            "SET write_permission = 'user', description = '경조사 신청을 접수하고 처리 상태를 확인합니다.' "
            "WHERE slug = 'mutual-aid'"
        )

    if _has_table("posts"):
        op.execute(
            "UPDATE posts "
            "SET status = 'published' "
            "WHERE status NOT IN ('draft', 'published', 'hidden', 'deleted')"
        )

    if _has_table("post_suggestions"):
        _drop_check("post_suggestions", "ck_post_suggestions_status")
        op.execute(
            "UPDATE post_suggestions "
            "SET status = CASE "
            "WHEN status IN ('done', 'answered', 'closed') THEN 'answered' "
            "ELSE 'received' END"
        )
        _create_check("post_suggestions", "ck_post_suggestions_status", "status IN ('received', 'answered')")


def downgrade() -> None:
    if _has_table("post_suggestions"):
        _drop_check("post_suggestions", "ck_post_suggestions_status")
        op.execute("UPDATE post_suggestions SET status = 'done' WHERE status = 'answered'")
        _create_check("post_suggestions", "ck_post_suggestions_status", "status IN ('received', 'in_progress', 'done')")

