"""add reservations and stock_ledger

Revision ID: 8d8cb7abfe5e
Revises: e26619a2f59c
Create Date: 2025-08-15 23:36:01.521677

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '8d8cb7abfe5e'
down_revision: Union[str, Sequence[str], None] = 'e26619a2f59c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('reservations',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('item_id', sa.UUID(), nullable=False),
    sa.Column('qty', sa.Integer(), nullable=False),
    sa.Column('status', postgresql.ENUM('hold', 'active', 'allocated', 'fulfilled', 'cancelled', 'expired', name='reservation_status'), server_default=sa.text("'hold'::reservation_status"), nullable=False),
    sa.Column('hold_window', postgresql.TSTZRANGE(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    postgresql.ExcludeConstraint((sa.column('item_id'), '='), (sa.column('branch_id'), '='), (sa.column('hold_window'), '&&'), where=sa.text("status in ('hold','active')"), using='gist', name='no_overlap_active'),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_reservations_gist', 'reservations', ['item_id', 'branch_id', 'hold_window'], unique=False, postgresql_using='gist')
    op.create_table('stock_ledger',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('item_id', sa.UUID(), nullable=False),
    sa.Column('event', postgresql.ENUM('receive', 'adjust', 'reserve_hold', 'reserve_release', 'allocate', 'ship', 'return', 'transfer_out', 'transfer_in', 'expire', name='stock_event'), nullable=False),
    sa.Column('qty', sa.Integer(), nullable=False),
    sa.Column('ref_type', sa.Text(), nullable=True),
    sa.Column('ref_id', sa.UUID(), nullable=True),
    sa.Column('at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_stock_ledger_branch_item_at', 'stock_ledger', ['branch_id', 'item_id', 'at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_stock_ledger_branch_item_at', table_name='stock_ledger')
    op.drop_table('stock_ledger')
    op.drop_index('ix_reservations_gist', table_name='reservations', postgresql_using='gist')
    op.drop_table('reservations')
