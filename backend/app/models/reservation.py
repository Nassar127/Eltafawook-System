from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID
from .sale import PaymentMethod

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, TSTZRANGE
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    branch_id:  Mapped[UUID]              = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    item_id:    Mapped[UUID]              = mapped_column(PG_UUID(as_uuid=True), ForeignKey("items.id",    ondelete="RESTRICT"), nullable=False)
    student_id: Mapped[Optional[UUID]]    = mapped_column(PG_UUID(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL"), nullable=True)

    qty:    Mapped[int]  = mapped_column(sa.Integer, nullable=False)
    status: Mapped[str]  = mapped_column(
        sa.Enum("queued","hold","active","fulfilled","cancelled","expired", name="reservation_status", create_type=False),
        nullable=False,
        server_default="hold",
    )

    hold_window = sa.Column(TSTZRANGE, nullable=True)

    unit_price_cents: Mapped[int]           = mapped_column(sa.Integer, nullable=False, server_default="0")
    prepaid_cents:    Mapped[int]           = mapped_column(sa.Integer, nullable=False, server_default="0")
    prepaid_at:       Mapped[Optional[datetime]] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=True)

    payment_method: Mapped[Optional[str]] = mapped_column(PaymentMethod, nullable=True)
    payer_reference:  Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    payment_proof_id: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    payment_proof_url:Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)

    notified_at:  Mapped[Optional[datetime]] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=True)
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=True)
    expired_at:   Mapped[Optional[datetime]] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=True)

    branch  = relationship("Branch",  lazy="joined")
    item    = relationship("Item",    lazy="joined")
    student = relationship("Student", lazy="joined")

    __table_args__ = (
        CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash','vodafone','instapay')",
            name="ck_reservations_payment_method"
        ),
    )
