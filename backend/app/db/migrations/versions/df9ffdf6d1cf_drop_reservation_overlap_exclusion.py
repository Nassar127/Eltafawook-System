"""drop reservation overlap exclusion"""

from alembic import op

revision = "df9ffdf6d1cf"
down_revision = "75c9ae28fc04"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("""
    DO $$
    DECLARE cname text;
    BEGIN
      SELECT conname INTO cname
      FROM pg_constraint
      WHERE conrelid = 'public.reservations'::regclass
        AND contype = 'x'
      LIMIT 1;

      IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.reservations DROP CONSTRAINT %I', cname);
      END IF;
    END $$;
    """)

def downgrade():
    op.execute("""
    ALTER TABLE public.reservations
      ADD CONSTRAINT no_overlap_active
      EXCLUDE USING gist (
        item_id WITH =,
        branch_id WITH =,
        hold_window WITH &&
      )
      WHERE (status IN ('hold','active'));
    """)
