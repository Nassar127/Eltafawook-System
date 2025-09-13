"""baseline

Revision ID: ec54df7e7bf1
Revises: 
Create Date: 2025-08-16 01:26:49.730882

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'ec54df7e7bf1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
