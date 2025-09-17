"""add_kg_service_types_to_enum

Revision ID: d257bc378143
Revises: dbf34f397b29
Create Date: 2025-09-16 17:10:13.387635

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd257bc378143'
down_revision: Union[str, Sequence[str], None] = 'dbf34f397b29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE kg_item_type ADD VALUE IF NOT EXISTS 'morning_service'")
    op.execute("ALTER TYPE kg_item_type ADD VALUE IF NOT EXISTS 'evening_service'")


def downgrade() -> None:
    pass
