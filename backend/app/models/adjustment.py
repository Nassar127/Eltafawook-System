from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Adjustment(Base):
    __tablename__ = "adjustments"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    item_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("items.id", ondelete="RESTRICT"), nullable=False)

    delta_on_hand: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    reason: Mapped[str] = mapped_column(sa.Text, nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        sa.CheckConstraint("delta_on_hand != 0", name="ck_adjustments_nonzero"),
        sa.Index("ix_adjustments_branch_item", "branch_id", "item_id"),
    )
