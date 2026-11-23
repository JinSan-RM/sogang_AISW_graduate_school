"""Store member post actions separately from operational audit records."""

from alembic import op
import sqlalchemy as sa

revision = "0036_user_post_activity"
down_revision = "0035_poll_question_deadline"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_post_activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("board_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "action IN ('post.create', 'post.update', 'post.delete')",
            name="ck_user_post_activity_logs_action",
        ),
    )
    op.create_index("ix_user_post_activity_logs_actor_created", "user_post_activity_logs", ["actor_id", "created_at"])
    op.create_index("ix_user_post_activity_logs_post_created", "user_post_activity_logs", ["post_id", "created_at"])


def downgrade():
    op.drop_table("user_post_activity_logs")
