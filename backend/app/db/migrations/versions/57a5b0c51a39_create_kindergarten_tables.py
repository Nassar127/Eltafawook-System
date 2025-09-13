"""Create kindergarten tables

Revision ID: 57a5b0c51a39
Revises: 2c05178b041a
Create Date: 2025-09-12 22:12:55.711650

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '57a5b0c51a39'
down_revision: Union[str, Sequence[str], None] = '2c05178b041a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('kg_students',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=False),
        sa.Column('full_name', sa.Text(), nullable=False),
        sa.Column('national_id', sa.String(length=14), nullable=True),
        sa.Column('nationality', sa.Text(), nullable=True),
        sa.Column('religion', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=False),
        sa.Column('place_of_birth', sa.Text(), nullable=True),
        sa.Column('father_name', sa.Text(), nullable=True),
        sa.Column('father_national_id', sa.String(length=14), nullable=True),
        sa.Column('father_profession', sa.Text(), nullable=True),
        sa.Column('father_phone', sa.String(length=20), nullable=True),
        sa.Column('father_whatsapp', sa.String(length=20), nullable=True),
        sa.Column('mother_phone', sa.String(length=20), nullable=True),
        sa.Column('guardian_name', sa.Text(), nullable=True),
        sa.Column('guardian_national_id', sa.String(length=14), nullable=True),
        sa.Column('guardian_relation', sa.Text(), nullable=True),
        sa.Column('guardian_phone', sa.String(length=20), nullable=True),
        sa.Column('guardian_whatsapp', sa.String(length=20), nullable=True),
        sa.Column('has_chronic_illness', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('chronic_illness_description', sa.Text(), nullable=True),
        sa.Column('attended_previous_nursery', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('previous_nursery_name', sa.Text(), nullable=True),
        sa.Column('needs_bus_subscription', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('alternative_transport_method', sa.Text(), nullable=True),
        sa.Column('authorized_pickups', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('application_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name=op.f('fk_kg_students_branch_id'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_kg_students')),
        sa.UniqueConstraint('national_id', name=op.f('uq_kg_students_national_id'))
    )

    op.create_table('kg_items',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=False),
        sa.Column('sku', sa.Text(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('default_price_cents', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('default_price_cents >= 0', name=op.f('ck_kg_items_price_non_negative')),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name=op.f('fk_kg_items_branch_id'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_kg_items')),
        sa.UniqueConstraint('sku', name=op.f('uq_kg_items_sku'))
    )

    op.create_table('kg_sales',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=False),
        sa.Column('kg_student_id', sa.UUID(), nullable=False),
        sa.Column('kg_item_id', sa.UUID(), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False),
        sa.Column('unit_price_cents', sa.Integer(), nullable=False),
        sa.Column('total_cents', sa.Integer(), nullable=False),
        sa.Column('sold_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('qty > 0', name=op.f('ck_kg_sales_qty_positive')),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name=op.f('fk_kg_sales_branch_id'), ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['kg_item_id'], ['kg_items.id'], name=op.f('fk_kg_sales_kg_item_id'), ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['kg_student_id'], ['kg_students.id'], name=op.f('fk_kg_sales_kg_student_id'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_kg_sales'))
    )

    op.create_table('kg_inventory_ledger',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=False),
        sa.Column('kg_item_id', sa.UUID(), nullable=False),
        sa.Column('event', sa.Enum('receive', 'adjust', 'ship', 'return', name='kg_ledger_event'), nullable=False),
        sa.Column('qty', sa.Integer(), nullable=False),
        sa.Column('ref_id', sa.UUID(), nullable=True),
        sa.Column('ref_type', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], name=op.f('fk_kg_inventory_ledger_branch_id'), ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['kg_item_id'], ['kg_items.id'], name=op.f('fk_kg_inventory_ledger_kg_item_id'), ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_kg_inventory_ledger'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('kg_inventory_ledger')
    op.drop_table('kg_sales')
    op.drop_table('kg_items')
    op.drop_table('kg_students')
    op.execute('DROP TYPE kg_ledger_event;')
