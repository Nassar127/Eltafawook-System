"""add orders and order_lines

Revision ID: 371e5da8d8f9
Revises: 8d8cb7abfe5e
Create Date: 2025-08-15 23:54:07.206809

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '371e5da8d8f9'
down_revision: Union[str, Sequence[str], None] = '8d8cb7abfe5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('orders',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_orders_branch', 'orders', ['branch_id'], unique=False)
    op.create_table('order_lines',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('order_id', sa.UUID(), nullable=False),
    sa.Column('item_id', sa.UUID(), nullable=False),
    sa.Column('qty', sa.Integer(), nullable=False),
    sa.Column('returned', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('qty > 0', name='ck_order_lines_qty_positive'),
    sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_order_lines_order', 'order_lines', ['order_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_order_lines_order', table_name='order_lines')
    op.drop_table('order_lines')
    op.drop_index('ix_orders_branch', table_name='orders')
    op.drop_table('orders')
