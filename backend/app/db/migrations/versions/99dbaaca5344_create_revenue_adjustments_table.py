"""create_revenue_adjustments_table

Revision ID: 99dbaaca5344
Revises: 42d06e189794
Create Date: 2025-09-06 18:00:59.787466

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '99dbaaca5344'
down_revision: Union[str, Sequence[str], None] = '42d06e189794'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('revenue_adjustments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('branch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('branches.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('adjustment_date', sa.Date(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_revenue_adjustments_branch_date', 'revenue_adjustments', ['branch_id', 'adjustment_date'])


def downgrade() -> None:
    op.drop_index('ix_revenue_adjustments_branch_date', table_name='revenue_adjustments')
    op.drop_table('revenue_adjustments')