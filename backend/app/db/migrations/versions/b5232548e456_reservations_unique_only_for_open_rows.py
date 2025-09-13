"""reservations: unique only for open rows

Revision ID: b5232548e456
Revises: 0496be072ec2
Create Date: 2025-08-24 12:52:53.513617

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b5232548e456'
down_revision: Union[str, Sequence[str], None] = '0496be072ec2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("""
    DO $$
    BEGIN
      -- example table constraint
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'reservations_student_item_unique'
      ) THEN
        ALTER TABLE reservations DROP CONSTRAINT reservations_student_item_unique;
      END IF;

      -- example plain unique index (no WHERE)
      IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename='reservations' AND indexname='reservations_student_item_idx'
      ) THEN
        DROP INDEX reservations_student_item_idx;
      END IF;

      -- example branch+item unique index
      IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename='reservations' AND indexname='reservations_branch_item_idx'
      ) THEN
        DROP INDEX reservations_branch_item_idx;
      END IF;
    END$$;
    """)

    op.execute("""
      CREATE UNIQUE INDEX IF NOT EXISTS ux_res_open_per_student_item
      ON reservations (student_id, branch_id, item_id)
      WHERE status IN ('hold','active');
    """)

def downgrade():
    op.execute("DROP INDEX IF EXISTS ux_res_open_per_student_item;")