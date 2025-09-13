"""add_context_to_revenue_adjustments

Revision ID: 197f630e53a3
Revises: 1fb52e3507e9
Create Date: 2025-09-13 01:24:07.440162

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '197f630e53a3'
down_revision: Union[str, Sequence[str], None] = '1fb52e3507e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    context_enum = postgresql.ENUM('bookstore', 'kindergarten', name='revenue_adjustment_context')
    context_enum.create(op.get_bind())

    op.add_column('revenue_adjustments', 
        sa.Column('context', sa.Enum('bookstore', 'kindergarten', name='revenue_adjustment_context'), 
                  nullable=False, server_default='bookstore')
    )


def downgrade() -> None:
    op.drop_column('revenue_adjustments', 'context')
    op.execute('DROP TYPE revenue_adjustment_context;')