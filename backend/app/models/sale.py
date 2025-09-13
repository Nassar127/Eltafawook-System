from __future__ import annotations

from datetime import datetime
from uuid import UUID
import sqlalchemy as sa
from sqlalchemy import Integer, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base

PaymentMethod = sa.Enum("cash", "vodafone_cash", "instapay", name="payment_method", create_type=False)

class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    sold_at:    Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    item_id:   Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("items.id",    ondelete="RESTRICT"), nullable=False)

    reservation_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("reservations.id", ondelete="SET NULL"), nullable=True)
    order_id:       Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("orders.id",       ondelete="SET NULL"), nullable=True)
    student_id:     Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("students.id",     ondelete="SET NULL"), nullable=True)

    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost_cents:  Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_cents:      Mapped[int] = mapped_column(Integer, nullable=False)

    payment_method = sa.Column(PaymentMethod, nullable=False)
    payer_reference = sa.Column(sa.Text)
    proof_media_url = sa.Column(sa.Text)

    branch = relationship("Branch", lazy="joined")
    item = relationship("Item", lazy="joined")
    reservation = relationship("Reservation", lazy="joined")
