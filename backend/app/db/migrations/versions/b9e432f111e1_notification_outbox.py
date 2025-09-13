"""notification outbox

Revision ID: b9e432f111e1
Revises: ac630d1c5826
Create Date: 2025-08-18 11:10:28.045367

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b9e432f111e1'
down_revision: Union[str, Sequence[str], None] = 'ac630d1c5826'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "notification_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("channel", sa.Text(), nullable=False),
        sa.Column("to", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reservations.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_outbox_state_created", "notification_outbox", ["state", "created_at"])

def downgrade():
    op.drop_index("ix_outbox_state_created", table_name="notification_outbox")
    op.drop_table("notification_outbox")