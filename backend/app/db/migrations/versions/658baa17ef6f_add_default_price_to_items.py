"""add default price to items

Revision ID: 658baa17ef6f
Revises: e4370f6de39b
Create Date: 2025-08-16 01:39:08.439364

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '658baa17ef6f'
down_revision: Union[str, Sequence[str], None] = 'e4370f6de39b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f('ix_sales_branch_sold_at'), table_name='sales')
    op.drop_index(op.f('ix_sales_reservation'), table_name='sales')
    op.drop_table('sales')
    op.add_column('items', sa.Column('default_price_cents', sa.Integer(), server_default='0', nullable=False))
    op.drop_index(op.f('ix_reservations_gist'), table_name='reservations', postgresql_using='gist')


def downgrade() -> None:
    op.create_index(op.f('ix_reservations_gist'), 'reservations', ['item_id', 'branch_id', 'hold_window'], unique=False, postgresql_using='gist')
    op.drop_column('items', 'default_price_cents')
    op.create_table('sales',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('sold_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('branch_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('item_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('reservation_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('qty', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('unit_price_cents', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('total_cents', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name=op.f('sales_branch_id_fkey'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['item_id'], ['items.id'], name=op.f('sales_item_id_fkey'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['reservation_id'], ['reservations.id'], name=op.f('sales_reservation_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('sales_pkey'))
    )
    op.create_index(op.f('ix_sales_reservation'), 'sales', ['reservation_id'], unique=False)
    op.create_index(op.f('ix_sales_branch_sold_at'), 'sales', ['branch_id', 'sold_at'], unique=False)
