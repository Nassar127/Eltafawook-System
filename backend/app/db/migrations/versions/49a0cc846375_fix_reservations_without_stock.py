"""fix reservations without stock

Revision ID: 49a0cc846375
Revises: b5232548e456
Create Date: 2025-08-31 15:34:31.051357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '49a0cc846375'
down_revision: Union[str, Sequence[str], None] = 'b5232548e456'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.alter_column('reservations', 'hold_window',
        existing_type=postgresql.TSTZRANGE(),
        nullable=True)

def downgrade():
    op.alter_column('reservations', 'hold_window',
        existing_type=postgresql.TSTZRANGE(),
        nullable=False)