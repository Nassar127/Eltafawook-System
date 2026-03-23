from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column

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

    id: Mapped[int] = mapped_column(sa.BigInteger, primary_key=True, autoincrement=True)
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    item_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("items.id", ondelete="RESTRICT"), nullable=False)

    event: Mapped[str] = mapped_column(StockEvent, nullable=False)
    qty: Mapped[int] = mapped_column(sa.Integer, nullable=False)

    ref_type: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    ref_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        sa.Index("ix_stock_ledger_branch_item_at", "branch_id", "item_id", "at"),
    )
