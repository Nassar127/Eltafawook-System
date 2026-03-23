from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base

PaymentMethod = sa.Enum("cash", "vodafone_cash", "instapay", name="payment_method", create_type=False)
OrderStatus = sa.Enum("completed", "voided", name="order_status", create_type=False)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    student_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("students.id", ondelete="RESTRICT"), nullable=False)

    payment_method: Mapped[Optional[str]] = mapped_column(PaymentMethod, nullable=False)
    payer_reference: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    proof_media_url: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(OrderStatus, nullable=False, server_default="completed")

    total_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")

    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        sa.Index("ix_orders_branch", "branch_id"),
        sa.Index("ix_orders_student", "student_id"),
        sa.Index("ix_orders_created", "created_at"),
    )


class OrderLine(Base):
    __tablename__ = "order_lines"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    order_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("items.id", ondelete="RESTRICT"), nullable=False)

    qty: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit_cost_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    line_total_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        sa.CheckConstraint("qty > 0", name="ck_order_lines_qty_positive"),
        sa.Index("ix_order_lines_order", "order_id"),
    )
