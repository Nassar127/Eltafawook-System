from __future__ import annotations

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

from backend.app.schemas.common import (
    OrmBase, Cents, PaymentMethod, OrderStatus
)

class OrderLineIn(BaseModel):
    item_id: UUID
    qty: int = Field(..., gt=0)
    unit_price_cents: Cents | None = None

class OrderCreate(BaseModel):
    branch_id: UUID
    student_id: UUID
    lines: list[OrderLineIn]

    payment_method: PaymentMethod
    payer_reference: str | None = None
    proof_media_url: str | None = None

    total_override_cents: Cents | None = None

    @field_validator("lines")
    @classmethod
    def _non_empty_lines(cls, v):
        if not v:
            raise ValueError("At least one line is required")
        return v

    @model_validator(mode="after")
    def _validate_non_cash(self):
        if self.payment_method in ("vodafone_cash", "instapay"):
            if not self.payer_reference:
                raise ValueError("payer_reference is required for non-cash payments")
            if not self.proof_media_url:
                raise ValueError("proof_media_url is required for non-cash payments")
        return self

class OrderOut(OrmBase):
    id: UUID
    branch_id: UUID
    student_id: UUID
    payment_method: PaymentMethod
    payer_reference: str | None = None
    proof_media_url: str | None = None
    status: OrderStatus
    total_cents: Cents
    created_at: datetime

class OrderLineOut(OrmBase):
    id: UUID
    order_id: UUID
    item_id: UUID
    qty: int
    unit_price_cents: Cents
    unit_cost_cents: Cents
    line_total_cents: Cents
    created_at: datetime

class QuickSaleRequest(BaseModel):
    branch_id: UUID
    student_id: UUID
    item_id: UUID
    qty: int = Field(..., gt=0)

    payment_method: PaymentMethod
    payer_reference: str | None = None
    proof_media_url: str | None = None

    @model_validator(mode="after")
    def _validate_non_cash(self):
        if self.payment_method in ("vodafone_cash", "instapay"):
            if not self.payer_reference:
                raise ValueError("payer_reference is required for non-cash payments")
            if not self.proof_media_url:
                raise ValueError("proof_media_url is required for non-cash payments")
        return self

class QuickSaleResponse(BaseModel):
    order_id: UUID
    line_id: UUID
    on_hand: int
    reserved: int
    available: int
    unit_price_cents: Cents | None = None
    line_total_cents: Cents | None = None
    total_cents: Cents | None = None
