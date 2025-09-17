from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List
from datetime import date

class KgDailySalesOut(BaseModel):
    branch_id: UUID
    day: date
    sales_count: int
    sales_total_cents: int
    adjustments_total_cents: int
    net_total_cents: int
    net_total_egp: float

class KgDetailedSalesRow(BaseModel):
    item_name: str
    total_qty: int
    total_amount_cents: int

class KgDetailedSalesReportOut(BaseModel):
    branch_id: UUID
    start_date: date
    end_date: date
    rows: List[KgDetailedSalesRow]

class SubscriptionStatusRow(BaseModel):
    student_name: str
    parent_phone: str | None
    last_payment_date: datetime
    next_payment_date: date
    last_used_plan: str

class SubscriptionReportOut(BaseModel):
    rows: List[SubscriptionStatusRow]