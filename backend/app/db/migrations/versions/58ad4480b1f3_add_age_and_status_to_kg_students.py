"""add_age_and_status_to_kg_students

Revision ID: 58ad4480b1f3
Revises: 57a5b0c51a39
Create Date: 2025-09-12 22:51:20.160356

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '58ad4480b1f3'
down_revision: Union[str, Sequence[str], None] = '57a5b0c51a39'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    kg_student_status = postgresql.ENUM('pending', 'accepted', 'rejected', 'waitlisted', name='kg_student_status')
    kg_student_status.create(op.get_bind())

    op.add_column('kg_students', sa.Column('status', sa.Enum('pending', 'accepted', 'rejected', 'waitlisted', name='kg_student_status'), nullable=False, server_default='pending'))
    op.add_column('kg_students', sa.Column('age_oct_years', sa.Integer(), nullable=True))
    op.add_column('kg_students', sa.Column('age_oct_months', sa.Integer(), nullable=True))
    op.add_column('kg_students', sa.Column('age_oct_days', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('kg_students', 'age_oct_days')
    op.drop_column('kg_students', 'age_oct_months')
    op.drop_column('kg_students', 'age_oct_years')
    op.drop_column('kg_students', 'status')
    op.execute('DROP TYPE kg_student_status;')