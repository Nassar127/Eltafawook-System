"""preorder payments + sales

Revision ID: e4370f6de39b
Revises: df9ffdf6d1cf
Create Date: 2025-08-16 02:50:05.817229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e4370f6de39b'
down_revision: Union[str, Sequence[str], None] = 'df9ffdf6d1cf'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        "reservations",
        sa.Column("unit_price_cents", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "reservations",
        sa.Column("prepaid_cents", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "reservations",
        sa.Column("prepaid_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "reservations",
        sa.Column("notified_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    op.execute("ALTER TABLE reservations ALTER COLUMN unit_price_cents DROP DEFAULT;")
    op.execute("ALTER TABLE reservations ALTER COLUMN prepaid_cents DROP DEFAULT;")

    op.create_table(
        "sales",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("sold_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("branch_id", sa.UUID(), nullable=False),
        sa.Column("item_id", sa.UUID(), nullable=False),
        sa.Column("reservation_id", sa.UUID(), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_sales_branch_sold_at", "sales", ["branch_id", "sold_at"])
    op.create_index("ix_sales_reservation", "sales", ["reservation_id"])

def downgrade():
    op.drop_index("ix_sales_reservation", table_name="sales")
    op.drop_index("ix_sales_branch_sold_at", table_name="sales")
    op.drop_table("sales")

    op.drop_column("reservations", "notified_at")
    op.drop_column("reservations", "prepaid_at")
    op.drop_column("reservations", "prepaid_cents")
    op.drop_column("reservations", "unit_price_cents")
