"""items unique per teacher (lower(sku))

Revision ID: 2389485305db
Revises: 49a0cc846375
Create Date: 2025-08-31 16:48:28.507304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2389485305db'
down_revision: Union[str, Sequence[str], None] = '49a0cc846375'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("""
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'items'::regclass
          AND contype = 'u'
      LOOP
        EXECUTE format('ALTER TABLE items DROP CONSTRAINT IF EXISTS %I', r.conname);
      END LOOP;

      FOR r IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'items' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%(sku%'
      LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
      END LOOP;
    END$$;
    """)

    op.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS ux_items_teacher_lowersku
      ON items (teacher_id, lower(sku));
    """)

def downgrade():
    op.execute("DROP INDEX IF EXISTS ux_items_teacher_lowersku;")