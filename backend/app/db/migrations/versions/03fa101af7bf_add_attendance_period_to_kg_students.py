"""add_attendance_period_to_kg_students

Revision ID: 03fa101af7bf
Revises: 58ad4480b1f3
Create Date: 2025-09-12 23:36:46.146703

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '03fa101af7bf'
down_revision: Union[str, Sequence[str], None] = '58ad4480b1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    kg_attendance_period = postgresql.ENUM('morning', 'evening', 'both', name='kg_attendance_period')
    kg_attendance_period.create(op.get_bind())
    op.add_column('kg_students', sa.Column('attendance_period', sa.Enum('morning', 'evening', 'both', name='kg_attendance_period'), nullable=False, server_default='morning'))


def downgrade() -> None:
    op.drop_column('kg_students', 'attendance_period')
    op.execute('DROP TYPE kg_attendance_period;')