from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel
from typing import Literal
from .common import OrmBase

Context = Literal['bookstore', 'kindergarten']

class RevenueAdjustmentCreate(BaseModel):
    branch_id: UUID
    context: Context
    adjustment_date: date
    amount_cents: int
    reason: str
    created_by: str | None = None

class RevenueAdjustmentOut(OrmBase):
    id: UUID
    branch_id: UUID
    adjustment_date: date
    amount_cents: int
    reason: str
    created_by: str | None = None
    created_at: datetime