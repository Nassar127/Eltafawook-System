"""revamp: add teacher enum/table + fix students.branch_id path

Revision ID: e80bd01a0f0c
Revises: 09d78ad1d582
Create Date: 2025-08-23 19:55:29.093065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e80bd01a0f0c'
down_revision: Union[str, Sequence[str], None] = '09d78ad1d582'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
