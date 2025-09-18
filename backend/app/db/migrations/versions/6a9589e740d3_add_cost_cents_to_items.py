"""add_cost_cents_to_items

Revision ID: 6a9589e740d3
Revises: d257bc378143
Create Date: 2025-09-18 04:56:18.628965

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a9589e740d3'
down_revision: Union[str, Sequence[str], None] = 'd257bc378143'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('items', sa.Column('cost_cents', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('items', 'cost_cents')