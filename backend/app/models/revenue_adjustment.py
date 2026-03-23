from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base

ContextEnum = sa.Enum('bookstore', 'kindergarten', name='revenue_adjustment_context', create_type=False)


class RevenueAdjustment(Base):
    __tablename__ = "revenue_adjustments"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)

    context: Mapped[str] = mapped_column(ContextEnum, nullable=False, server_default='bookstore')

    adjustment_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    amount_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    reason: Mapped[str] = mapped_column(sa.Text, nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())