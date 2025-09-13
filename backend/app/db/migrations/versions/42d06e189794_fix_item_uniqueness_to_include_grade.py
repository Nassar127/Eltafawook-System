"""fix_item_uniqueness_to_include_grade

Revision ID: 42d06e189794
Revises: efb3890e2e5c
Create Date: 2025-09-05 20:34:16.605706

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '42d06e189794'
down_revision: Union[str, Sequence[str], None] = 'efb3890e2e5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ux_items_teacher_lowersku;")

    op.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS ux_items_teacher_grade_sku
        ON items (teacher_id, grade, lower(sku));
    """)


def downgrade() -> None:
    """Revert item uniqueness."""
    op.execute("DROP INDEX IF EXISTS ux_items_teacher_grade_sku;")
    op.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS ux_items_teacher_lowersku
        ON items (teacher_id, lower(sku));
    """)