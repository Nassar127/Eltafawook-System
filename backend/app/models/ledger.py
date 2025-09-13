import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM
from backend.app.db.base import Base

StockEvent = ENUM(
    "receive",
    "adjust",
    "reserve_hold",
    "reserve_release",
    "allocate",
    "ship",
    "return",
    "transfer_out",
    "transfer_in",
    "expire",
    name="stock_event",
)

class StockLedger(Base):
    """
    Immutable event log for stock changes.
    Sum(qty) per (branch_id, item_id) = on_hand.
    """
    __tablename__ = "stock_ledger"

    id = sa.Column(sa.BigInteger, primary_key=True, autoincrement=True)
    branch_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    item_id   = sa.Column(UUID(as_uuid=True), sa.ForeignKey("items.id",    ondelete="RESTRICT"), nullable=False)

    event = sa.Column(StockEvent, nullable=False)
    qty   = sa.Column(sa.Integer, nullable=False)

    ref_type = sa.Column(sa.Text)
    ref_id   = sa.Column(UUID(as_uuid=True))
    at       = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.Index("ix_stock_ledger_branch_item_at", "branch_id", "item_id", "at"),
    )
