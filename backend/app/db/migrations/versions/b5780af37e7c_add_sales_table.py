"""add sales table

Revision ID: b5780af37e7c
Revises: 658baa17ef6f
Create Date: 2025-08-16 04:15:54.899250

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'b5780af37e7c'
down_revision: Union[str, Sequence[str], None] = '658baa17ef6f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "sales",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("sold_at",    sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("branch_id",  UUID(as_uuid=True), nullable=False),
        sa.Column("item_id",    UUID(as_uuid=True), nullable=False),
        sa.Column("reservation_id", UUID(as_uuid=True), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
    )

    op.create_foreign_key(
        "sales_branch_id_fkey", "sales", "branches", ["branch_id"], ["id"], ondelete="RESTRICT"
    )
    op.create_foreign_key(
        "sales_item_id_fkey", "sales", "items", ["item_id"], ["id"], ondelete="RESTRICT"
    )
    op.create_foreign_key(
        "sales_reservation_id_fkey", "sales", "reservations", ["reservation_id"], ["id"], ondelete="RESTRICT"
    )

    op.create_index("ix_sales_branch_sold_at", "sales", ["branch_id", "sold_at"])
    op.create_index("ix_sales_reservation", "sales", ["reservation_id"])


def downgrade() -> None:
    op.drop_index("ix_sales_reservation", table_name="sales")
    op.drop_index("ix_sales_branch_sold_at", table_name="sales")
    op.drop_constraint("sales_reservation_id_fkey", "sales", type_="foreignkey")
    op.drop_constraint("sales_item_id_fkey", "sales", type_="foreignkey")
    op.drop_constraint("sales_branch_id_fkey", "sales", type_="foreignkey")
    op.drop_table("sales")