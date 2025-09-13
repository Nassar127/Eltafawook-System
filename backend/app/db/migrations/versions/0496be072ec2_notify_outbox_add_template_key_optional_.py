"""notify_outbox: add template_key (+optional cols)

Revision ID: 0496be072ec2
Revises: e80bd01a0f0c
Create Date: 2025-08-24 12:23:03.502786

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '0496be072ec2'
down_revision: Union[str, Sequence[str], None] = 'e80bd01a0f0c'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("notification_outbox")}

    if "template_key" not in cols:
        op.add_column("notification_outbox", sa.Column("template_key", sa.Text(), nullable=True))
    if "locale" not in cols:
        op.add_column("notification_outbox", sa.Column("locale", sa.Text(), nullable=True))
    if "variables" not in cols:
        op.add_column("notification_outbox", sa.Column("variables", postgresql.JSONB, nullable=True))
    if "media_url" not in cols:
        op.add_column("notification_outbox", sa.Column("media_url", sa.Text(), nullable=True))

    if "created_at" not in cols:
        op.add_column(
            "notification_outbox",
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.alter_column("notification_outbox", "created_at", server_default=None)
    if "sent_at" not in cols:
        op.add_column("notification_outbox", sa.Column("sent_at", sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade():
    for name in ["sent_at", "created_at", "media_url", "variables", "locale", "template_key"]:
        try:
            op.drop_column("notification_outbox", name)
        except Exception:
            pass