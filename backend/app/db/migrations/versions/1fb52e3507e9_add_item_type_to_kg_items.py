"""add_item_type_to_kg_items

Revision ID: 1fb52e3507e9
Revises: 03fa101af7bf
Create Date: 2025-09-13 00:21:48.211870

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision: str = '1fb52e3507e9'
down_revision: Union[str, Sequence[str], None] = '03fa101af7bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    kg_item_type = postgresql.ENUM('good', 'service', name='kg_item_type')
    kg_item_type.create(op.get_bind())
    op.add_column('kg_items', sa.Column('item_type', sa.Enum('good', 'service', name='kg_item_type'), nullable=False, server_default='good'))


def downgrade() -> None:
    op.drop_column('kg_items', 'item_type')
    op.execute('DROP TYPE kg_item_type;')
