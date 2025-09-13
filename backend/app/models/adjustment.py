import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base

class Adjustment(Base):
    __tablename__ = "adjustments"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    item_id   = sa.Column(UUID(as_uuid=True), sa.ForeignKey("items.id",    ondelete="RESTRICT"), nullable=False)

    delta_on_hand = sa.Column(sa.Integer, nullable=False)
    reason        = sa.Column(sa.Text, nullable=False)
    actor         = sa.Column(sa.Text)

    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.CheckConstraint("delta_on_hand != 0", name="ck_adjustments_nonzero"),
        sa.Index("ix_adjustments_branch_item", "branch_id", "item_id"),
    )
