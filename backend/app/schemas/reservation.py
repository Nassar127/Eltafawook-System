from __future__ import annotations
from datetime import datetime
from uuid import UUID
from typing import Optional, Literal, TypeAlias

from pydantic import BaseModel, Field, model_validator
from backend.app.schemas.common import OrmBase, Cents, ReservationStatus

PaymentMethod: TypeAlias = Literal["cash", "vodafone_cash", "instapay"]

class ReservationCreate(BaseModel):
    branch_id: UUID
    item_id: UUID
    qty: int
    student_id: Optional[UUID] = None
    unit_price_cents: int
    prepaid_cents: int = 0
    payment_method: Optional[PaymentMethod] = None
    payer_reference: Optional[str] = None
    payment_proof_id: Optional[str] = None
    payment_proof_url: Optional[str] = None
    payer_phone: Optional[str] = Field(None, description="alias -> payer_reference")
    proof_media_url: Optional[str] = Field(None, description="alias -> payment_proof_url")

    def canonical(self):
        return self.copy(update={
            "payer_reference": self.payer_reference or self.payer_phone,
            "payment_proof_url": self.payment_proof_url or self.proof_media_url,
        })

class ReservationOut(OrmBase):
    id: UUID
    branch_id: UUID
    item_id: UUID
    qty: int
    status: ReservationStatus
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    student_id: Optional[UUID] = None
    unit_price_cents: Optional[int] = None
    prepaid_cents: Optional[int] = None
    prepaid_at: Optional[datetime] = None
    notified_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

class ReservationDetailOut(ReservationOut):
    branch_code: str
    sku: str
    item_name: str
    student_name: Optional[str] = None
    student_phone: Optional[str] = None
