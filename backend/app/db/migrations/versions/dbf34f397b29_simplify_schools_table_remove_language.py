"""simplify_schools_table_remove_language

Revision ID: dbf34f397b29
Revises: 197f630e53a3
Create Date: 2025-09-13 02:08:37.565074

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'dbf34f397b29'
down_revision: Union[str, Sequence[str], None] = '197f630e53a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('schools', 'language')
    op.execute('DROP TYPE IF EXISTS school_language;')


def downgrade() -> None:
    school_language_enum = postgresql.ENUM('arabic', 'english', name='school_language')
    school_language_enum.create(op.get_bind())
    
    op.add_column('schools', sa.Column('language', school_language_enum, nullable=False, server_default='arabic'))