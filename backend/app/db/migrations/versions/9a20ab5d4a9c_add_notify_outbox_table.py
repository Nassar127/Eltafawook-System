"""add notify_outbox table

Revision ID: 9a20ab5d4a9c
Revises: b9e432f111e1
Create Date: 2025-08-18 11:41:02.621657

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


# revision identifiers, used by Alembic.
revision: str = '9a20ab5d4a9c'
down_revision: Union[str, Sequence[str], None] = 'b9e432f111e1'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "notify_outbox",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("event", sa.Text(), nullable=False),
        sa.Column("ref_type", sa.Text(), nullable=False),
        sa.Column("ref_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("scheduled_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    # helpful indexes
    op.create_index("ix_notify_outbox_ref", "notify_outbox", ["ref_id"])
    op.create_index("ix_notify_outbox_status_sched", "notify_outbox", ["status", "scheduled_at"])

    # optional: constrain status values
    op.create_check_constraint(
        "ck_notify_outbox_status",
        "notify_outbox",
        "status in ('queued','sent','failed')",
    )


def downgrade():
    op.drop_constraint("ck_notify_outbox_status", "notify_outbox", type_="check")
    op.drop_index("ix_notify_outbox_status_sched", table_name="notify_outbox")
    op.drop_index("ix_notify_outbox_ref", table_name="notify_outbox")
    op.drop_table("notify_outbox")