"""add schools, students, reservations.student_id

Revision ID: 75c9ae28fc04
Revises: 371e5da8d8f9
Create Date: 2025-08-16 00:20:10.825211

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '75c9ae28fc04'
down_revision: Union[str, Sequence[str], None] = '371e5da8d8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('schools',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('city', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('students',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('full_name', sa.Text(), nullable=False),
    sa.Column('phone', sa.Text(), nullable=True),
    sa.Column('phone_norm', sa.Text(), nullable=True),
    sa.Column('school_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_students_name', 'students', ['full_name'], unique=False)
    op.create_index('ix_students_phone_norm', 'students', ['phone_norm'], unique=False)
    op.add_column('reservations', sa.Column('student_id', sa.UUID(), nullable=True))
    op.create_foreign_key(None, 'reservations', 'students', ['student_id'], ['id'], ondelete='SET NULL')



def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'reservations', type_='foreignkey')
    op.drop_column('reservations', 'student_id')
    op.drop_index('ix_students_phone_norm', table_name='students')
    op.drop_index('ix_students_name', table_name='students')
    op.drop_table('students')
    op.drop_table('schools')
