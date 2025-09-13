"""add op_log for offline batch sync

Revision ID: ac630d1c5826
Revises: b5780af37e7c
Create Date: 2025-08-16 23:21:33.875595

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


revision: str = 'ac630d1c5826'
down_revision: Union[str, Sequence[str], None] = 'b5780af37e7c'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "op_log",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("op_type", sa.Text(), nullable=False),
        sa.Column("request", pg.JSONB(), nullable=False),
        sa.Column("response", pg.JSONB(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_op_log_created_at", "op_log", ["created_at"])

def downgrade():
    op.drop_index("ix_op_log_created_at", table_name="op_log")
    op.drop_table("op_log")